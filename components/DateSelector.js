import { useDispatch, useSelector } from 'react-redux';
import DatePicker from 'react-datepicker';
import {
     Box,
    Button,
    Heading,
    AlertDialog,
    AlertDialogBody,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogOverlay,
    useDisclosure,
} from '@chakra-ui/react';
import 'react-datepicker/dist/react-datepicker.css';
import { setStartDate, setEndDate, datesSet } from '../redux/dates.slice';
import { clearCart } from '../redux/cart.slice';
import React from 'react';
import { useState } from 'react';

export default function DateSelector() {
    const dates = useSelector((state) => state.dates);
    const cart = useSelector(state => state.cart)
    const dispatch = useDispatch();

    const Ref = React.useRef()

    const {isOpen, onOpen, onClose} = useDisclosure()

    const [startDateModified, setStartDateModified] = useState(false)
    const [endDateModified, setEndDateModified] = useState(false)

    const [startDate, setLocalStartDate] = useState()
    const [endDate, setLocalEndDate] = useState()


    function setDates(){
        dispatch(clearCart())

        dispatch(setStartDate(startDate))
        dispatch(setEndDate(endDate))
        dispatch(datesSet(true))

        onClose()
    }

    return (
        <>
            <Heading>Aloitus</Heading>

            Tehdäksesi varauksen sinun täytyy valita kamojen nouto- ja palautusajankohdat.<br/>
            <Button onClick={onOpen}>
                {dates.datesSet ? 'Muokkaa päivämääriä' : 'Aseta päivämäärät'}
            </Button>
        

            <AlertDialog
                isOpen={isOpen}
                leastDestructiveRef={Ref}
                onClose={onClose}
            >
                <AlertDialogOverlay>
                        <AlertDialogContent>
                        <AlertDialogHeader fontSize='lg' fontWeight='bold'>
                            Valitse varauksen ajankohdat
                        </AlertDialogHeader>

                        <AlertDialogBody>
                            <Heading size={'md'}>Nouto</Heading>
                            <Box padding={'4px'} flexDirection='row' display='flex'>
                                <DatePicker
                                    selected={startDateModified ? startDate : false}
                                    placeholderText='Kamojen noutoaika'
                                    onChange={(date) => {setLocalStartDate(date); setStartDateModified(true)}}
                                    showTimeSelect
                                    dateFormat='d.M.yyyy H:mm'
                                    timeFormat='H:mm'
                                />
                            </Box>

                            <Heading size={'md'}>Palautus</Heading>
                            <Box padding={'4px'}>
                                <DatePicker
                                    selected={endDateModified ? endDate : false}
                                    placeholderText='Kamojen palautusaika'
                                    onChange={(date) => {setLocalEndDate(date); setEndDateModified(true)}}
                                    showTimeSelect
                                    dateFormat='d.M.yyyy H:mm'
                                    timeFormat='H:mm'
                                />
                            </Box>
                            {dates.datesSet ? 'HUOM! Päivämäärien muokkaaminen tyhjentää ostoskorin' : null}
                        </AlertDialogBody>

                        <AlertDialogFooter>
                        <Button ref={Ref} onClick={onClose} ml={3}>
                            Peruuta
                        </Button>
                        <Button colorScheme='blue' onClick={() => setDates()} ml={3}>
                            Valitse ajankohdat
                        </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>                  
        
        </>
    );

    
}
