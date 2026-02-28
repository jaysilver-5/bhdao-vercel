import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ArtifactsModule } from './artifacts/artifacts.module';
import { VotesModule } from './votes/votes.module';
import { CronModule } from './cron/cron.module';
import { ExpertModule } from './expert/expert.module';
import { FlagsModule } from './flags/flags.module';
import { CommentsModule } from './comments/comments.module';
import { ChainModule } from './chain/chain.module';
import { IpfsModule } from './ipfs/ipfs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    ArtifactsModule,
    VotesModule,
    CronModule,
    ExpertModule,
    FlagsModule,
    CommentsModule,
    ChainModule,
    IpfsModule,
  ],
})
export class AppModule {}