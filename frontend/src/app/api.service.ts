import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../environments/environment';

// Define interfaces for API response types
interface Artist {
  artist_name: string;
  artist_id: string;
  artist_image: string | null;
}

interface ArtistDetails {
  name: string;
  birthday: string;
  deathday: string;
  nationality: string;
  biography: string;
}

interface Artwork {
  artwork_id: string;
  title: string;
  date: string;
  image_url: string | null;
}

interface Category {
  name: string;
  image_url: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl; // Base URL from environment (e.g., https://web-tech-hw3-455523.wl.r.appspot.com/api)

  constructor(private http: HttpClient) {}

  // Handle errors consistently
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client-side error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Server error: ${error.status} - ${error.error?.error || error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // Get a test message from the backend
  getMessage(): Observable<{ message: string }> {
    return this.http.get<{ message: string }>(`${this.apiUrl}/message`).pipe(
      catchError(this.handleError)
    );
  }

  // Search for artists by name
  searchArtists(artist: string): Observable<Artist[]> {
    return this.http.get<Artist[]>(`${this.apiUrl}/search?artist=${encodeURIComponent(artist)}`).pipe(
      catchError(this.handleError)
    );
  }

  // Get details for a specific artist
  getArtistDetails(artistId: string): Observable<ArtistDetails> {
    return this.http.get<ArtistDetails>(`${this.apiUrl}/artists/${artistId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Get similar artists for a given artist ID
  getSimilarArtists(artistId: string): Observable<Artist[]> {
    return this.http.get<Artist[]>(`${this.apiUrl}/similar-artists?artistId=${artistId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Get artworks for a given artist ID
  getArtworks(artistId: string): Observable<Artwork[] | { error: string }> {
    return this.http.get<Artwork[] | { error: string }>(`${this.apiUrl}/artworks?artistId=${artistId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Get categories (genes) for a given artwork ID
  getCategories(artworkId: string): Observable<Category[] | { message: string }> {
    return this.http.get<Category[] | { message: string }>(`${this.apiUrl}/categories?artworkId=${artworkId}`).pipe(
      catchError(this.handleError)
    );
  }
}