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

interface VerificationTemplateProps {
	domain: string;
	token: string;
}

export function VerificationTemplate({
	domain,
	token
}: VerificationTemplateProps) {
	const verificationLink = `${domain}/account/verify?token=${token}`;

	return (
		<Html>
			<Head />
			<Preview>Confirm your email to finish setting up your account</Preview>

			<Tailwind>
				<Body className='max-w-2xl mx-auto p-6 bg-slate-50'>
					<Section className='text-center mb-8'>
						<Heading className='text-3xl text-black font-bold'>
							Confirm your email address
						</Heading>
						<Text className='text-base text-black'>
							Thanks for signing up! Confirm your email address to activate your
							account and start streaming. This link expires in 5 minutes.
						</Text>
						<Link
							className='inline-flex justify-center items-center rounded-full text-sm font-medium text-white bg-[#18B9AE] px-5 py-2'
							href={verificationLink}
						>
							Confirm email
						</Link>
					</Section>

					{/* Some clients strip buttons, so the raw URL has to be here too. */}
					<Section className='text-center mb-8'>
						<Text className='text-sm text-gray-600'>
							If the button does not work, copy and paste this link into your
							browser:
						</Text>
						<Link
							href={verificationLink}
							className='text-sm text-[#18b9ae] underline break-all'
						>
							{verificationLink}
						</Link>
					</Section>

					<Section className='text-center mb-8'>
						<Text className='text-gray-600'>
							If you did not create this account, you can safely ignore this
							email. If you have any questions, reach us at{' '}
							<Link
								href='mailto:twitch@gmail.com'
								className='text-[#18b9ae] underline'
							>
								twitch@gmail.com
							</Link>
							.
						</Text>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
}
