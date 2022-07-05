import { Heading,
        Flex,
        Box, 
        Spacer, 
        IconButton, 
        Drawer, 
        DrawerBody, 
        DrawerContent, 
        DrawerOverlay, 
        TableContainer, 
        Table,
        Tbody,
        Tr,
        Td } from '@chakra-ui/react';
import { HamburgerIcon } from '@chakra-ui/icons';
import Link from './Link';
import { useSession } from 'next-auth/react';
import { useDisclosure } from '@chakra-ui/react';

export default function TopBar({ children }) {
    const { data: session } = useSession();
    const role = session?.user?.group;

    const { isOpen, onOpen, onClose } = useDisclosure()

    return (
        <>
            <Flex
                color='white'
                backgroundBlendMode='overlay'
                background='rgba(66,131,209,0.9)'
                justify='space-between'
                align='center'
                position='fixed'
                top='0'
                width='100%'
                zIndex='9999'
                backdropFilter='auto'
                backdropBlur='4px'
                gap='5'
            >   
                <Box
                    marginInlineStart='0.5em'
                    display={['block', 'block', 'none', 'none',' none']}    
                >
                    <IconButton
                        aria-label='open menu'
                        icon={<HamburgerIcon />}
                        colorScheme='blue'
                        onClick={isOpen ? onClose : onOpen}
                        
                    />
                </Box>
                

                <Box
                    marginInlineStart='2em'
                >
                    <Link href='/'>
                        <Heading>KLAPI</Heading>
                    </Link>
                </Box>
                <Spacer display={['none', 'none', 'block', 'block',' block']}/>
        
                {role === 'ADMIN' ?
                <>
                    <Link href='/loan' display={['none', 'none', 'block', 'block',' block']}>Varaukset</Link>
                    <Link href='/admin' display={['none', 'none', 'block', 'block',' block']}>Hallinta</Link>
                </>
                : null}       
                <Link href='/account' display={['none', 'none', 'block', 'block',' block']}>Oma tili</Link>
                    
                <Box
                    marginInlineEnd='em'
                >
                    {children}
                </Box>
                
            </Flex>

            <Drawer placement='top' onClose={onClose} isOpen={isOpen}>
                <DrawerOverlay />
                <DrawerContent>
                <DrawerBody paddingTop='4rem'>
                    <TableContainer>
                        <Table variant={'simple'}>
                            <Tbody>
                                <Tr>
                                    <Td><Link href='/loan' onClick={onClose}>Varaukset</Link></Td> 
                                </Tr>
                                <Tr>
                                    <Td><Link href='/admin' onClick={onClose}>Hallinta</Link></Td>
                                </Tr>
                                <Tr>
                                    <Td><Link href='/account' onClick={onClose}>Oma tili</Link></Td>
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
