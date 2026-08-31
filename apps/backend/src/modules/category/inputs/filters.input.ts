import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

@InputType()
export class CategoryFiltersInput {
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
}
