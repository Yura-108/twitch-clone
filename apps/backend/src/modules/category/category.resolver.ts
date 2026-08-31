import { Args, Query, Resolver } from '@nestjs/graphql';

import { CategoryFiltersInput } from '@/src/modules/category/inputs/filters.input';
import { CategoryModel } from '@/src/modules/category/models/category.model';

import { CategoryService } from './category.service';

@Resolver('Category')
export class CategoryResolver {
	public constructor(private readonly categoryService: CategoryService) {}

	@Query(() => [CategoryModel], { name: 'findAllCategories' })
	public async findAll(
		@Args('filters', { nullable: true }) filters?: CategoryFiltersInput
	) {
		return await this.categoryService.findAll(filters);
	}

	@Query(() => [CategoryModel], { name: 'findRandomCategories' })
	public async findRandom() {
		return await this.categoryService.findRandom();
	}

	@Query(() => CategoryModel, { name: 'findCategoryBySlug' })
	public async findBySlug(@Args('slug') slug: string) {
		return await this.categoryService.findBySlug(slug);
	}
}
