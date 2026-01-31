import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PredictionController } from './prediction/prediction.controller';
import { PredictionService } from './prediction/prediction.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, PredictionController],
  providers: [AppService, PredictionService],
})
export class AppModule {}


