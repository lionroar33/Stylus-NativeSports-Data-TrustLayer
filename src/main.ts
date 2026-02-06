import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const hbs = require('hbs');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure static assets
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Configure view engine (Handlebars)
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  // Register partials directory
  hbs.registerPartials(join(__dirname, '..', 'views', 'partials'));

  // Register Handlebars helpers
  hbs.registerHelper('eq', (a: any, b: any) => a === b);
  hbs.registerHelper('json', (context: any) => JSON.stringify(context));

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application running on: http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
