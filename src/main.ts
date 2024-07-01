/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { envs } from './config/envs';
import { Logger, ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  
  const app = await NestFactory.createMicroservice<MicroserviceOptions>( //npm i --save @nestjs/microservices
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers
      }
    }
  );
  
  const logger = new Logger( 'Orders_MS-main.ts' );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );

  await app.listen();
  logger.log( `Orders Microservice running on port ${ envs.port } ♦` );
}
bootstrap();
