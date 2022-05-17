import { useDispatch, useSelector } from 'react-redux';
import DatePicker from 'react-datepicker';
import { Box, Button, Heading, Textarea } from '@chakra-ui/react';
import 'react-datepicker/dist/react-datepicker.css';
import { setStartDate, setEndDate } from '../redux/dates.slice';
import { setDescription } from '../redux/cart.slice';
import Link from './Link';

export default function DateSelector() {
    const dates = useSelector((state) => state.dates);
    const dispatch = useDispatch();

    return (
        <div>
            <Heading size={'md'}>Aloitus</Heading>
            <Box padding={'4px'} flexDirection='row' display='flex'>
                <DatePicker
                    selected={dates.startDate}
                    onChange={(date) => dispatch(setStartDate(date))}
                    dateFormat='d.M.yyyy'
                />
            </Box>

            <Heading size={'md'}>Lopetus</Heading>
            <Box padding={'4px'}>
                <DatePicker
                    selected={dates.endDate}
                    onChange={(date) => dispatch(setEndDate(date))}
                    dateFormat='d.M.yyyy'
                />
            </Box>
        </div>
    );
}
