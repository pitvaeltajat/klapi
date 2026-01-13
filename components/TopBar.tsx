import {
	Heading,
	Flex,
	Box,
	IconButton,
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerOverlay,
	TableContainer,
	Table,
	Tbody,
	Tr,
	Td,
	Link,
	Container,
	Circle,
	useBreakpointValue,
} from '@chakra-ui/react';
import { FaBars } from 'react-icons/fa';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import { useDisclosure } from '@chakra-ui/react';
import { ReactNode, useState, useRef, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';

export default function TopBar({ children }: { children: ReactNode }) {
	const [titleHover, setTitleHover] = useState(false);
	const [revealWords, setRevealWords] = useState(false);
	const revealDelayRef = useRef<number | null>(null);
	const { data: session } = useSession();
	const role = session?.user?.group;
	const { isOpen, onOpen, onClose } = useDisclosure();
	const isDesktop = useBreakpointValue({ base: false, md: true }) ?? false;

	useEffect(() => {
		if (!isDesktop) {
			setTitleHover(false);
			if (revealDelayRef.current) window.clearTimeout(revealDelayRef.current);
			setRevealWords(false);
		}
	}, [isDesktop]);

	const {
		state: { items },
	} = useCart();
	const totalItems = items.reduce((sum, item) => sum + item.amount, 0);

	return (
		<>
			<Box
				as='header'
				position='fixed'
				top={0}
				left={0}
				right={0}
				bg='rgba(66,131,209,0.9)'
				backdropFilter='auto'
				backdropBlur='4px'
				zIndex={1000}
				boxShadow='sm'
			>
				<Container maxW='container.xl' px={4}>
					<Flex h='4rem' align='center' justify='space-between' color='white'>
						<Flex align='center' gap={4}>
							<IconButton
								aria-label='open menu'
								icon={<FaBars />}
								colorScheme='whiteAlpha'
								onClick={isOpen ? onClose : onOpen}
								display={['block', 'block', 'none']}
								variant='ghost'
								color='white'
								_hover={{ bg: 'whiteAlpha.300' }}
								_active={{ bg: 'whiteAlpha.400' }}
							/>

							<Box>
								<Link
									as={NextLink}
									href='/'
									_hover={{ textDecoration: 'none' }}
									onMouseEnter={() => {
										if (!isDesktop) return;
										setTitleHover(true);
										if (revealDelayRef.current) window.clearTimeout(revealDelayRef.current);
										revealDelayRef.current = window.setTimeout(() => setRevealWords(true), 180);
									}}
									onMouseLeave={() => {
										if (!isDesktop) return;
										setTitleHover(false);
										if (revealDelayRef.current) window.clearTimeout(revealDelayRef.current);
										setRevealWords(false);
									}}
									onFocus={() => {
										if (!isDesktop) return;
										setTitleHover(true);
										if (revealDelayRef.current) window.clearTimeout(revealDelayRef.current);
										revealDelayRef.current = window.setTimeout(() => setRevealWords(true), 180);
									}}
									onBlur={() => {
										if (!isDesktop) return;
										setTitleHover(false);
										if (revealDelayRef.current) window.clearTimeout(revealDelayRef.current);
										setRevealWords(false);
									}}
									aria-label={
										titleHover || revealWords
											? 'Kaluston Lainaus Applikaatio Pitvalaisten Ilmeiseen tarpeeseen'
											: 'KLAPI'
									}
									tabIndex={0}
								>
									<Box
										display='flex'
										alignItems='center'
										gap={revealWords ? '0.4ch' : '0.8ch'}
										as='span'
										fontSize='lg'
									>
										{!titleHover && !revealWords ? (
											<Box
												as='span'
												display='inline-block'
												fontWeight='semibold'
												lineHeight='1'
												fontSize={revealWords ? 'lg' : '2xl'}
												letterSpacing='0.02em'
											>
												KLAPI
											</Box>
										) : (
											['Kaluston', 'Lainaus', 'Applikaatio', 'Pitvalaisten', 'Ilmeiseen tarpeeseen'].map(
												(word, idx) => {
													const letter = word[0];
													const collapsed = '1.4ch';
													const gapWidth = '3ch';
													const expanded = `${Math.max(word.length + 1, 5)}ch`;
													const width = revealWords ? expanded : titleHover ? gapWidth : collapsed;
													return (
														<Box
															as='span'
															key={idx}
															overflow='hidden'
															whiteSpace='nowrap'
															transition='width 220ms cubic-bezier(.2,.8,.2,1), opacity 160ms'
															width={width}
															minW={collapsed}
															display='inline-flex'
															alignItems='center'
															justifyContent='flex-start'
															textAlign='left'
															fontWeight='semibold'
															px={revealWords ? 2 : 0}
															letterSpacing='0.02em'
														>
															<Box
																as='span'
																display='inline-block'
																transformOrigin='left center'
																transition='transform 220ms'
																fontSize={revealWords ? 'lg' : '2xl'}
																lineHeight='1'
															>
																{revealWords ? word : letter}
															</Box>
														</Box>
													);
												}
											)
										)}
									</Box>
								</Link>
							</Box>
						</Flex>

						<Flex gap={6} align='center' display={['none', 'none', 'flex']}>
							{role === 'ADMIN' && (
								<>
									<Link as={NextLink} href='/loan' fontWeight='medium'>
										Varaukset
									</Link>
									<Link as={NextLink} href='/admin' fontWeight='medium'>
										Hallinta
									</Link>
								</>
							)}
							<Link as={NextLink} href='/account' fontWeight='medium'>
								Oma tili
							</Link>
							<Box position='relative'>
								{children}
								{totalItems > 0 && (
									<Circle
										position='absolute'
										right='-12px'
										top='-12px'
										marginTop='5px'
										size='24px'
										bg='red.500'
										color='white'
										fontSize='sm'
										fontWeight='bold'
										display='flex'
										alignItems='center'
										justifyContent='center'
										boxShadow='md'
									>
										{totalItems}
									</Circle>
								)}
							</Box>
						</Flex>

						<Box display={['block', 'block', 'none']} position='relative'>
							{children}
							{totalItems > 0 && (
								<Circle
									position='absolute'
									right='-12px'
									top='-12px'
									size='24px'
									bg='red.500'
									color='white'
									fontSize='sm'
									fontWeight='bold'
									display='flex'
									alignItems='center'
									justifyContent='center'
									boxShadow='md'
								>
									{totalItems}
								</Circle>
							)}
						</Box>
					</Flex>
				</Container>
			</Box>
			<Box h='4rem' />{' '}
			<Drawer placement='top' onClose={onClose} isOpen={isOpen}>
				<DrawerOverlay />
				<DrawerContent>
					<DrawerBody pt='4rem'>
						<TableContainer>
							<Table variant='simple'>
								<Tbody>
									<Tr>
										<Td>
											<Link as={NextLink} href='/loan' onClick={onClose}>
												Varaukset
											</Link>
										</Td>
									</Tr>
									<Tr>
										<Td>
											<Link as={NextLink} href='/admin' onClick={onClose}>
												Hallinta
											</Link>
										</Td>
									</Tr>
									<Tr>
										<Td>
											<Link as={NextLink} href='/account' onClick={onClose}>
												Oma tili
											</Link>
										</Td>
									</Tr>
								</Tbody>
							</Table>
						</TableContainer>
					</DrawerBody>
				</DrawerContent>
			</Drawer>
		</>
	);
}
