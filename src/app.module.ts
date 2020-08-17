import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { KafkaModule } from '@device/kafka';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@device/config';
import { JwtModule } from '@nestjs/jwt';
import { LoggerMiddleware, LoggerModule } from '@device/logger';
import { AuthMiddleware } from '@device/auth';
import { DeviceModule } from './device/device.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    LoggerModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => configService.getAuth(),
    }),
    KafkaModule.forRootAsync(),
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => configService.getMongo(),
      inject: [ConfigService],
    }),
    DeviceModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): any {
    consumer.apply(AuthMiddleware, LoggerMiddleware).forRoutes('api/(.*)?');
  }
}
