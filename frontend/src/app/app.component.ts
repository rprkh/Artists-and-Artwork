import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { CommonModule } from '@angular/common'; // Import CommonModule

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule], // Add CommonModule here
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  message: string = '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    this.http.get<{ message: string }>('http://localhost:3000/api/message', { withCredentials: true })
      .subscribe({
        next: (response) => this.message = response.message,
        error: (err) => console.error('Error fetching message:', err)
      });
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
}