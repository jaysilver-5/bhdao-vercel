import { Module } from '@nestjs/common';
import { ExpertController } from './expert.controller';
import { ExpertService } from './expert.service';
import { ChainModule } from '../chain/chain.module';
import { IpfsModule } from '../ipfs/ipfs.module';

@Module({
  imports: [ChainModule, IpfsModule],
  controllers: [ExpertController],
  providers: [ExpertService],
  exports: [ExpertService],
})
export class ExpertModule {}