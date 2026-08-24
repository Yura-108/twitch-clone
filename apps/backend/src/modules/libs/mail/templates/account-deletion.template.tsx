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

interface AccountDeletionTemplateProps {
	domain: string;
}

export function AccountDeletionTemplate({
	domain
}: AccountDeletionTemplateProps) {
	const registerLink = `${domain}/account/create`;

	return (
		<Html>
			<Head />
			<Preview>Your Twitch account has been deleted</Preview>
			<Tailwind>
				<Body className='max-w-2xl mx-auto p-6 bg-slate-50'>
					<Section className='text-center'>
						<Heading className='text-3xl text-black font-bold'>
							Your account has been deleted
						</Heading>
						<Text className='text-base text-black mt-2'>
							Your account has been permanently erased from the Twitch database.
							All of your data and information are gone for good.
						</Text>
					</Section>

					<Section className='bg-white text-black text-center rounded-lg shadow-md p-6 mb-4'>
						<Text>
							You will no longer receive notifications by email or on Telegram.
						</Text>
						<Text>
							If you ever want to come back, you can create a new account here:
						</Text>
						<Link
							href={registerLink}
							className='inline-flex justify-center items-center rounded-md mt-2 text-sm font-medium text-white bg-[#18B9AE] px-5 py-2'
						>
							Sign up for Twitch
						</Link>
					</Section>

					<Section className='text-center text-black'>
						<Text>
							Thank you for being with us. You are always welcome back on the
							platform.
						</Text>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
}
