import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
  });

  // Swagger Documentation setup mounted at /api/docs
  const config = new DocumentBuilder()
    .setTitle('Odoo Hackathon API')
    .setDescription('Interactive API documentation for hackathon endpoints')
    .setVersion('1.0')
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
