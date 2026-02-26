import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    const port = process.env.PORT || 4000;
    await app.listen(port);
    console.log(`API listening on http://localhost:${port}`);
}

void bootstrap();
