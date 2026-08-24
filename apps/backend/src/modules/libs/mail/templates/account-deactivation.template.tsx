import React from 'react';
import {
	Body,
	Head,
	Heading,
	Html,
	Link,
	Preview,
	Section,
	Tailwind,
	Text
} from 'react-email';

import type { SessionMetadata } from '@/src/shared/types/session-metadata.types';

interface AccountDeactivationTemplateProps {
	token: string;
	metadata: SessionMetadata;
}

export function AccountDeactivationTemplate({
	token,
	metadata
}: AccountDeactivationTemplateProps) {
	return (
		<Html>
			<Head />
			<Preview>Confirm your account deactivation</Preview>
			<Tailwind>
				<Body className='max-w-2xl mx-auto p-6 bg-slate-50'>
					<Section className='text-center mb-8'>
						<Heading className='text-3xl text-black font-bold'>
							Account deactivation requested
						</Heading>
						<Text className='text-black text-base mt-2'>
							You started deactivating your <b>Twitch</b> account.
						</Text>
					</Section>

					<Section className='bg-gray-100 rounded-lg p-6 text-center mb-6'>
						<Heading className='text-2xl text-black font-semibold'>
							Confirmation code
						</Heading>
						<Heading className='text-3xl text-black font-semibold'>
							{token}
						</Heading>
						<Text className='text-black'>
							This code is valid for 5 minutes.
						</Text>
					</Section>

					<Section className='bg-gray-100 rounded-lg p-6 mb-6'>
						<Heading className='text-xl font-semibold text-[#18B9AE]'>
							Request details
						</Heading>
						<ul className='list-disc list-inside text-black mt-2'>
							<li>
								🌍 Location: {metadata.location.country},{' '}
								{metadata.location.city}
							</li>
							<li>📱 Operating system: {metadata.device.os}</li>
							<li>🌐 Browser: {metadata.device.browser}</li>
							<li>💻 IP address: {metadata.ip}</li>
						</ul>
						<Text className='text-gray-600 mt-2'>
							If you did not request this, you can safely ignore this email —
							your account stays active.
						</Text>
					</Section>

					<Section className='text-center mt-8'>
						<Text className='text-gray-600'>
							Questions or trouble with your account? Reach our support team at{' '}
							<Link
								href='mailto:help@twitch.com'
								className='text-[#18b9ae] underline'
							>
								help@twitch.com
							</Link>
							.
						</Text>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
}
