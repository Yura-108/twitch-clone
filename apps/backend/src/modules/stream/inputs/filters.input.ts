import { Field, InputType, Int } from '@nestjs/graphql';
import {
	IsInt,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min
} from 'class-validator';

@InputType()
export class FiltersInput {
	@Field(() => Int, { nullable: true })
	@IsInt()
	@Min(1)
	@Max(50)
	@IsOptional()
	public take?: number;

	@Field(() => Int, { nullable: true })
	@IsInt()
	@Min(0)
	@IsOptional()
	public skip?: number;

	@Field(() => String, { nullable: true })
	@IsString()
	@MaxLength(100)
	@IsOptional()
	public searchTerm?: string;
}
