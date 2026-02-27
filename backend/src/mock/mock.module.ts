import { Module } from '@nestjs/common';
import { TontinesModule } from '../tontines/tontines.module';
import { MockWalletService } from './mock-wallet.service';
import { MockTestController } from './mock-test.controller';

@Module({
  imports: [TontinesModule],
  controllers: [MockTestController],
  providers: [MockWalletService],
  exports: [MockWalletService],
})
export class MockModule {}
