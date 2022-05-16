import { useDispatch, useSelector } from 'react-redux';
import DatePicker from 'react-datepicker';
import { Box, Button, Heading, Textarea } from '@chakra-ui/react';
import 'react-datepicker/dist/react-datepicker.css';
import { setStartDate, setEndDate } from '../redux/dates.slice';
import { setDescription } from '../redux/cart.slice';
import Link from '../components/Link';

export default function selectDate() {
    const days = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
    const months = [
        'Tammi',
        'Helmi',
        'Maalis',
        'Huhti',
        'Touko',
        'Kesä',
        'Heinä',
        'Elo',
        'Syys',
        'Loka',
        'Marras',
        'Joulu',
    ];

    const startDate = new Date();
    const endDate = new Date();

    const dates = useSelector((state) => state.dates);
    const description = useSelector((state) => state.cart.description);
    const dispatch = useDispatch();

    return (
        <div>
            <Heading>Varauksen perustiedot</Heading>

            <Heading size={'md'}>Aloitus</Heading>
            <Box padding={'4px'}>
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
            <Heading size={'md'}>Kuvaus</Heading>
            <Textarea
                onChange={(e) => dispatch(setDescription(e.target.value))}
            />
            <Link href='/productlist'>
                <Button>Siirry valitsemaan tavarat</Button>
            </Link>
        </div>
    );
}
