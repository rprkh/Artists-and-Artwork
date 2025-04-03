import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit {
  currentView: 'search' | 'login' | 'register' = 'search';
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  searchForm!: FormGroup;
  isLoading = false;
  searchResults: any[] = [];
  searchCompleted = false;

  selectedArtist: any = null;
  currentDetailView: 'info' | 'artworks' = 'info';
  isLoadingDetails = false;
  artistDetails: any = null;
  artworks: any[] = [];
  similarArtists: any[] = [];

  showCategoriesModal = false;
  categories: any[] = [];
  isLoadingCategories = false;
  selectedArtwork: any = null; // Store the artwork details for the modal

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.authService.currentUser$.pipe(first()).subscribe(user => {
      if (user) {
        this.router.navigate(['/home']);
      }
    });

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      fullname: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.searchForm = this.fb.group({
      artistName: ['', Validators.required]
    });
  }

  onLoginSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.authService.login(email, password).subscribe({
        next: (response) => {
          console.log('Login successful', response);
          this.router.navigate(['/home']);
        },
        error: (error) => {
          console.error('Login failed', error);
          let errorMessage = 'Login failed: ';
          if (error.status === 0) {
            errorMessage += 'Cannot connect to server.';
          } else if (error.status === 404) {
            errorMessage += 'API endpoint not found.';
          } else if (error.error && error.error.message) {
            errorMessage += error.error.message;
          } else {
            errorMessage += 'Unknown error occurred';
          }
          alert(errorMessage);
        }
      });
    }
  }

  onRegisterSubmit() {
    if (this.registerForm.valid) {
      const { fullname, email, password } = this.registerForm.value;
      this.authService.register(fullname, email, password).subscribe({
        next: (response) => {
          console.log('Registration successful', response);
          this.router.navigate(['/home']);
        },
        error: (error) => {
          console.error('Registration failed', error);
          let errorMessage = 'Registration failed: ';
          if (error.status === 0) {
            errorMessage += 'Cannot connect to server.';
          } else if (error.status === 404) {
            errorMessage += 'API endpoint not found.';
          } else if (error.error && error.error.message) {
            errorMessage += error.error.message;
          } else {
            errorMessage += 'Unknown error occurred';
          }
          alert(errorMessage);
        }
      });
    }
  }

  onSearchSubmit() {
    if (this.searchForm.valid) {
      const artistName = this.searchForm.get('artistName')?.value;
      this.isLoading = true;
      this.searchResults = [];
      this.searchCompleted = false;

      this.http.get(`${environment.apiUrl}/search?q=${encodeURIComponent(artistName)}`)
        .subscribe({
          next: (response: any) => {
            console.log('Search results:', response);
            this.searchResults = response;
            this.isLoading = false;
            this.searchCompleted = true;
          },
          error: (error) => {
            console.error('Search failed:', error);
            this.isLoading = false;
            this.searchCompleted = true;
            alert('Search failed. Please try again.');
          }
        });
    }
  }

  checkTextOverflow(text: string): boolean {
    return text.length > 20;
  }

  onClear() {
    this.searchForm.reset();
    this.searchResults = [];
    this.isLoading = false;
    this.searchCompleted = false;
    this.selectedArtist = null;
    this.artistDetails = null;
    this.artworks = [];
    this.similarArtists = [];
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  onCardClick(artist: any) {
    this.selectedArtist = artist;
    this.currentDetailView = 'info';
    this.isLoadingDetails = true;
    this.artistDetails = null;
    this.artworks = [];
    this.similarArtists = [];

    this.fetchArtistDetails(artist.artist_id);
  }

  fetchArtistDetails(artistId: string) {
    this.http.get(`${environment.apiUrl}/artists/${artistId}`).subscribe({
      next: (response: any) => {
        this.artistDetails = response;
        this.fetchSimilarArtists(artistId);
      },
      error: (error) => {
        console.error('Failed to fetch artist details:', error);
        this.isLoadingDetails = false;
        alert('Failed to load artist details.');
      }
    });
  }

  fetchSimilarArtists(artistId: string) {
    this.http.get(`${environment.apiUrl}/similar-artists?artistId=${artistId}`).subscribe({
      next: (response: any) => {
        this.similarArtists = response;
        if (this.currentDetailView === 'artworks') {
          this.fetchArtworks(artistId);
        } else {
          this.isLoadingDetails = false;
        }
      },
      error: (error) => {
        console.error('Failed to fetch similar artists:', error);
        this.similarArtists = [];
        this.isLoadingDetails = false;
        alert('Failed to load similar artists.');
      }
    });
  }

  fetchArtworks(artistId: string) {
    this.http.get(`${environment.apiUrl}/artworks?artistId=${artistId}`).subscribe({
      next: (response: any) => {
        this.artworks = response.error ? [] : response;
        this.isLoadingDetails = false;
      },
      error: (error) => {
        console.error('Failed to fetch artworks:', error);
        this.artworks = [];
        this.isLoadingDetails = false;
        alert('Failed to load artworks.');
      }
    });
  }

  viewCategories(artworkId: string) {
    // Find the artwork to get its details
    this.selectedArtwork = this.artworks.find(art => art.artwork_id === artworkId) || { image_url: '../../assets/artsy_logo.svg', title: 'Unknown', date: 'N/A' };
    this.showCategoriesModal = true;
    this.isLoadingCategories = true;
    this.categories = [];

    this.http.get(`${environment.apiUrl}/categories?artworkId=${artworkId}`).subscribe({
      next: (response: any) => {
        if (response.error) {
          this.categories = [{ name: response.error, image_url: null }];
        } else {
          this.categories = response;
        }
        this.isLoadingCategories = false;
      },
      error: (error) => {
        console.error('Failed to fetch categories:', error);
        this.categories = [{ name: 'Failed to load categories.', image_url: null }];
        this.isLoadingCategories = false;
      }
    });
  }

  closeCategoriesModal() {
    this.showCategoriesModal = false;
    this.categories = [];
    this.selectedArtwork = null;
  }

  switchDetailView(view: 'info' | 'artworks') {
    this.currentDetailView = view;
    if (view === 'artworks' && this.artworks.length === 0 && this.selectedArtist) {
      this.isLoadingDetails = true;
      this.fetchArtworks(this.selectedArtist.artist_id);
    }
  }
}