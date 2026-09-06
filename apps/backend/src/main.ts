import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend dir and fallback to root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps/backend/.env') });
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend and mobile access
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global DTO Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger Documentation setup mounted at /api/docs
  const config = new DocumentBuilder()
    .setTitle('DealFlow360 API')
    .setDescription('DealFlow360 — Intelligent, Self-Governing Sales Operations Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'JWT login, OTP signup, password reset, token rotation')
    .addTag('Health', 'System health and database connectivity probe')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
  console.log(`🩺 Health check endpoint: http://localhost:${port}/api/health`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
