import { Resolver } from '@nestjs/graphql';
import { PasswordRecoveryService } from './password-recovery.service';

@Resolver('PasswordRecovery')
export class PasswordRecoveryResolver {
  constructor(private readonly passwordRecoveryService: PasswordRecoveryService) {}


}
