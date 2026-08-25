import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { User } from '@prisma/generated/client';
import { type FileUpload, GraphQLUpload } from 'graphql-upload-ts';

import { Authorization } from '@/src/shared/decorators/auth.decorator';
import { Authorized } from '@/src/shared/decorators/authorized.decorator';

import { ProfileService } from './profile.service';
import {ChangeProfileInfoInput} from "@/src/modules/auth/profile/inputs/change-profile-info.input";
import {SocialLinkInput, SocialLinkOrderInput} from "@/src/modules/auth/profile/inputs/social-link.input";
import {SocialLinkModel} from "@/src/modules/auth/profile/models/social-link.model";

@Resolver('Profile')
export class ProfileResolver {
	constructor(private readonly profileService: ProfileService) {}

	@Authorization()
	@Mutation(() => Boolean, { name: 'changeProfileAvatar' })
	public async changeAvatar(
		@Authorized() user: User,
		@Args('avatar', { type: () => GraphQLUpload }) avatar: Promise<FileUpload>
	) {
		return this.profileService.changeAvatar(user, avatar);
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'removeProfileAvatar' })
	public async removeAvatar(
		@Authorized() user: User,
	) {
		return this.profileService.removeAvatar(user);
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'changeProfileInfo' })
	public async changeInfo(
		@Authorized() user: User,
		@Args('data') input: ChangeProfileInfoInput
	) {
		return this.profileService.changeInfo(user, input);
	}

	@Authorization()
	@Query(() => [SocialLinkModel], { name: 'findSocialLinks' })
	public async findSocialLinks(
		@Authorized() user: User,
	) {
		return this.profileService.findSocialLinks(user);
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'reorderSocialLinks' })
	public async reorderLinks(
		@Authorized() user: User,
		@Args('list', {type: () => [SocialLinkOrderInput]}) list: SocialLinkOrderInput[],
	) {
		return this.profileService.reorderSocialLinks(user, list);
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'createSocialLink' })
	public async createLink(
		@Authorized() user: User,
		@Args('data') input: SocialLinkInput
	) {
		return this.profileService.createSocialLink(user, input);
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'updateSocialLink' })
	public async updateLink(
		@Authorized() user: User,
		@Args('id', { type: () => ID }) id: string,
		@Args('data') input: SocialLinkInput
	) {
		return this.profileService.updateSocialLink(user, id, input)
	}

	@Authorization()
	@Mutation(() => Boolean, { name: 'removeSocialLink' })
	public async removeLink(
		@Authorized() user: User,
		@Args('id', { type: () => ID }) id: string,
	) {
		return this.profileService.removeSocialLink(user, id);
	}
}
