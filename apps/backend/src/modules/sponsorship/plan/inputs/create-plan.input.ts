import { Field, InputType } from '@nestjs/graphql';
import {
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min
} from 'class-validator';

@InputType()
export class CreatePlanInput {
	@Field(() => String)
	@IsString()
	@IsNotEmpty()
	@MaxLength(250)
	public title: string;

	@Field(() => String, { nullable: true })
	@IsString()
	@IsOptional()
	@MaxLength(500)
	public description?: string;

	@Field(() => Number)
	@IsNumber({ maxDecimalPlaces: 2 })
	@Min(1)
	@Max(1_000_000)
	public price: number;
}
