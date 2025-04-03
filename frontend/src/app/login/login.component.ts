// import { Component } from '@angular/core';
// import { AuthService } from '../auth.service';
// import { Router } from '@angular/router';
// import { FormsModule } from '@angular/forms';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-login',
//   standalone: true,
//   imports: [FormsModule, CommonModule],
//   templateUrl: './login.component.html',
// })
// export class LoginComponent {
//   email = '';
//   password = '';

//   constructor(private authService: AuthService, private router: Router) {}

//   login() {
//     if (!this.email || !this.password) {
//       alert('Please enter both email and password');
//       return;
//     }

//     console.log('Attempting login with:', { email: this.email, password: this.password });

//     this.authService.login(this.email, this.password)
//       .subscribe({
//         next: (response) => {
//           console.log('Login response:', response);
//           alert('Login successful');
//           console.log('Navigating to /home');
//           this.router.navigate(['/home']).then(success => {
//             console.log('Navigation result:', success ? 'Success' : 'Failed');
//           });
//         },
//         error: (err) => {
//           console.error('Login error:', err);
//           alert('Login failed: ' + (err.error?.message || 'Unknown error'));
//         }
//       });
//   }
// }