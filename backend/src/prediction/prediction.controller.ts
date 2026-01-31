import { Controller, Get, Param, Query } from '@nestjs/common';
import { PredictionService } from './prediction.service';

@Controller('api/prediction')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Get('round/:coin')
  async getCurrentRound(@Param('coin') coin: string) {
    return this.predictionService.getCurrentRound(coin);
  }

  @Get('round/:coin/:roundId')
  async getRound(
    @Param('coin') coin: string,
    @Param('roundId') roundId: string,
  ) {
    return this.predictionService.getRound(coin, parseInt(roundId));
  }

  @Get('price/:coin')
  async getCurrentPrice(@Param('coin') coin: string) {
    return this.predictionService.getCurrentPrice(coin);
  }

  @Get('user-bet/:coin/:address/:roundId')
  async getUserBet(
    @Param('coin') coin: string,
    @Param('address') address: string,
    @Param('roundId') roundId: string,
  ) {
    return this.predictionService.getUserBet(coin, address, parseInt(roundId));
  }

  @Get('payout/:coin/:roundId')
  async calculatePayout(
    @Param('coin') coin: string,
    @Param('roundId') roundId: string,
    @Query('position') position: string,
    @Query('amount') amount: string,
  ) {
    return this.predictionService.calculatePayout(
      coin,
      parseInt(roundId),
      position,
      amount,
    );
  }
}


