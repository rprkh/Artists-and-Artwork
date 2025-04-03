import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../auth.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styles: [`
    .home-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
    }
    .loading {
      font-style: italic;
      color: #666;
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  userFullname: string = '';
  isLoading = true;
  private userSubscription: Subscription | null = null;
  private initSubscription: Subscription | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    console.log('HomeComponent initialized');
    
    // Subscribe to auth initialization state
    this.initSubscription = this.authService.authStateInitialized$.subscribe(initialized => {
      console.log('Auth state initialized:', initialized);
      this.isLoading = !initialized;
    });

    // Subscribe to user changes
    this.userSubscription = this.authService.currentUser$.subscribe((user: User | null) => {
      console.log('Current user updated in HomeComponent:', user);
      
      if (user && user.fullname) {
        this.userFullname = user.fullname;
        console.log('Setting userFullname to:', this.userFullname);
      } else {
        this.userFullname = '';
        
        // If auth is initialized and no user, redirect to login
        if (!this.isLoading && !user) {
          console.log('No authenticated user, redirecting to login');
          this.router.navigate(['/login']);
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.initSubscription) {
      this.initSubscription.unsubscribe();
    }
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Navigate anyway if there's an error
        this.router.navigate(['/']);
      }
    });
  }
}