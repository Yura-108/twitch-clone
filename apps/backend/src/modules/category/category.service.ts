import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/src/core/prisma/prisma.service';
import { CategoryFiltersInput } from '@/src/modules/category/inputs/filters.input';
import { pickRandom } from '@/src/shared/utils/pick-random.util';

@Injectable()
export class CategoryService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async findAll(input: CategoryFiltersInput = {}) {
		const { take, skip } = input;

		return this.prismaService.category.findMany({
			take: Math.min(take ?? 12, 50),
			skip: skip ?? 0,
			orderBy: {
				createdAt: 'desc'
			},
			include: {
				streams: {
					include: {
						user: true
					}
				}
			}
		});
	}

	public async findRandom() {
		const ids = await this.prismaService.category.findMany({
			select: { id: true }
		});

		const picked = pickRandom(ids, 7);

		if (!picked.length) {
			return [];
		}

		return this.prismaService.category.findMany({
			where: {
				id: {
					in: picked.map(category => category.id)
				}
			},
			include: {
				streams: {
					include: {
						user: true
					}
				}
			}
		});
	}

	public async findBySlug(slug: string) {
		const category = await this.prismaService.category.findUnique({
			where: { slug },
			include: {
				streams: {
					include: {
						user: true
					}
				}
			}
		});

		if (!category) {
			throw new NotFoundException('Category is not found');
		}

		return category;
	}
}
