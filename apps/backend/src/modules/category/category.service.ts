import {Injectable, NotFoundException} from '@nestjs/common';
import {PrismaService} from "@/src/core/prisma/prisma.service";
import {Category} from "@prisma/generated/client";

@Injectable()
export class CategoryService {
	public constructor(private readonly prismaService: PrismaService) {}

	public async findAll() {
		return this.prismaService.category.findMany({
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
		const total = await this.prismaService.category.count();

		const amount = Math.min(7, total);

		if (!amount) {
			return [];
		}

		const offsets = new Set<number>();

		while (offsets.size < amount) {
			offsets.add(Math.floor(Math.random() * total));
		}

		const categories = await Promise.all(
			Array.from(offsets).map(skip =>
			this.prismaService.category.findFirst({
				include: {
					streams: {
						include: {
							user: true
						}
					}
				},
				orderBy: {
					id: 'asc'
				},
				skip
			}))
		);

		return categories.filter(category => category !== null);
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
			throw new NotFoundException('Category is not found')
		}

		return category;
	}
}
