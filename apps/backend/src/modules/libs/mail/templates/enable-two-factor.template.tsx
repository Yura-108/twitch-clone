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

interface EnableTwoFactorTemplateProps {
	domain: string;
}

export function EnableTwoFactorTemplate({
	domain
}: EnableTwoFactorTemplateProps) {
	const settingsLink = `${domain}/dashboard/settings`;

	return (
		<Html>
			<Head />
			<Preview>Add an extra layer of security to your account</Preview>
			<Tailwind>
				<Body className='max-w-2xl mx-auto p-6 bg-slate-50'>
					<Section className='text-center mb-8'>
						<Heading className='text-3xl text-black font-bold'>
							Protect your account with two-factor authentication
						</Heading>
						<Text className='text-black text-base mt-2'>
							Turn on two-factor authentication to make your account
							significantly harder to break into.
						</Text>
					</Section>

					<Section className='bg-white rounded-lg shadow-md p-6 text-center mb-6'>
						<Heading className='text-2xl text-black font-semibold'>
							Why it matters
						</Heading>
						<Text className='text-base text-black mt-2'>
							Two-factor authentication adds a second step to signing in: a code
							that only you can generate. Even someone who knows your password
							cannot get in without it.
						</Text>
						<Link
							href={settingsLink}
							className='inline-flex justify-center items-center rounded-md text-sm font-medium text-white bg-[#18B9AE] px-5 py-2'
						>
							Go to account settings
						</Link>
					</Section>

					<Section className='text-center mt-8'>
						<Text className='text-gray-600'>
							Questions? Reach our support team at{' '}
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
