import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

// Importa tu appConfig existente
import { appConfig } from './app/app.config';

// HTTP + Interceptor
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authTokenInterceptor } from './app/interceptor/auth-token.interceptor';

bootstrapApplication(AppComponent, {
  // Mantiene TODO lo que ya tienes en appConfig
  ...appConfig,
  // y agrega (o extiende) los providers con el interceptor
  providers: [
    ...(appConfig.providers ?? []),
    provideHttpClient(withInterceptors([authTokenInterceptor])),
  ],
}).catch((err) => console.error(err));
