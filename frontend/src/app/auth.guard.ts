import { Injectable } from '@angular/core';
import { Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take, filter, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    // Wait for auth state to be initialized before making a decision
    return this.authService.authStateInitialized$.pipe(
      // Only proceed once auth state is initialized
      filter((initialized: boolean) => initialized),
      // Take only the first emission after initialization
      take(1),
      // Then check if the user is authenticated
      switchMap(() => this.authService.currentUser$.pipe(take(1))),
      map(user => {
        if (user) {
          return true;
        } else {
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}