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

export function ChannelVerificationTemplate() {
	return (
		<Html>
			<Head />
			<Preview>Your channel is now verified</Preview>
			<Tailwind>
				<Body className='max-w-2xl mx-auto p-6 bg-slate-50'>
					<Section className='text-center mb-8'>
						<Heading className='text-3xl text-black font-bold'>
							Congratulations — your channel is verified
						</Heading>
						<Text className='text-black text-base mt-2'>
							Your channel has been verified and now carries the official badge.
						</Text>
					</Section>

					<Section className='bg-white rounded-lg shadow-md p-6 text-center mb-6'>
						<Heading className='text-2xl text-black font-semibold'>
							What this means
						</Heading>
						<Text className='text-base text-black mt-2'>
							The verification badge confirms your channel is authentic, which
							helps viewers trust that they are watching the real you.
						</Text>
					</Section>

					<Section className='text-center mt-8'>
						<Text className='text-gray-600'>
							Questions? Write to us at{' '}
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
