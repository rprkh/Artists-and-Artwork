// // src/app/app.module.ts
// import { NgModule } from '@angular/core';
// import { BrowserModule } from '@angular/platform-browser';
// import { FormsModule } from '@angular/forms';
// import { AppRoutingModule } from './app-routing.module';
// import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
// import { AppComponent } from './app.component';
// import { RegisterComponent } from './register/register.component';
// import { LoginComponent } from './login/login.component';

// @NgModule({
//   declarations: [
//     // AppComponent,
//     // RegisterComponent,
//     // LoginComponent
//   ],
//   imports: [
//     BrowserModule,
//     FormsModule,
//     AppRoutingModule,
//     AppComponent,        // Add standalone components here
//     RegisterComponent,   // Add standalone components here
//     LoginComponent
//   ],
//   providers: [
//     provideHttpClient(withInterceptorsFromDi())
//   ],
//   bootstrap: [AppComponent]
// })
// export class AppModule {}