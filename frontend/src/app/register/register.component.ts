// import { Component } from '@angular/core';
// import { AuthService } from '../auth.service';
// import { Router } from '@angular/router';
// import { FormsModule } from '@angular/forms';
// import { CommonModule } from '@angular/common';

// @Component({
//   selector: 'app-register',
//   standalone: true,
//   imports: [FormsModule, CommonModule],
//   templateUrl: './register.component.html',
// })
// export class RegisterComponent {
//   fullname = '';
//   email = '';
//   password = '';

//   constructor(private authService: AuthService, private router: Router) {}

//   register() {
//     if (!this.fullname || !this.email || !this.password) {
//       alert('Please fill in all fields');
//       return;
//     }

//     this.authService.register(this.fullname, this.email, this.password)
//       .subscribe({
//         next: (response) => {
//           console.log('Registration response:', response);
//           alert('Registration successful');
//           this.router.navigate(['/home']).then(success => {
//             console.log('Navigation to /home:', success ? 'Success' : 'Failed');
//           });
//         },
//         error: (err) => {
//           console.error('Registration error:', err);
//           alert('Registration failed: ' + (err.error?.message || 'Unknown error'));
//         }
//       });
//   }
// }