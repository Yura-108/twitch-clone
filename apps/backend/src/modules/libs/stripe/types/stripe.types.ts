import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import type { StripeConfig } from 'stripe';

export const StripeOptionsSymbol = Symbol('StripeOptionsSymbol');

export type TypeStripeOptions = {
	apiKey: string;
	config?: StripeConfig;
};

export type TypeStripeAsyncOptions = Pick<ModuleMetadata, 'imports'> &
	Pick<FactoryProvider<TypeStripeOptions>, 'useFactory' | 'inject'>;
