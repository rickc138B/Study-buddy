import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
 const app = await NestFactory.create<NestExpressApplication>(AppModule);
 const port = process.env.PORT ?? 3000;
 app.enableCors();
 app.useStaticAssets(join(__dirname, '..', 'public'));
 await app.listen(port, '0.0.0.0');
 console.log(`Course Assistant API running on port ${port}`);
}
bootstrap();
