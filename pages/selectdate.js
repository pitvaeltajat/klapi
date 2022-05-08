import { useDispatch, useSelector } from "react-redux"
import DatePicker from 'react-datepicker'
import { Box, Button } from "@chakra-ui/react"
import "react-datepicker/dist/react-datepicker.css"
import { setStartDate, setEndDate } from "../redux/dates.slice"
import NextLink from 'next/link'

export default function selectDate(){

    const days = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su']
    const months = ['Tammi']

    const startDate = new Date()
    const endDate = new Date()

    const dates = useSelector((state) => state.dates)
    const dispatch = useDispatch() 
    
    return(
        <div>
            <h2>Aloitetaan valitsemalla päivämäärät</h2>

            <h2>Aloitus</h2>
            <Box padding={'4px'}>
                <DatePicker
                    selected={dates.startDate}
                    onChange={(date) => dispatch(setStartDate(date))}
                    dateFormat="d.M.yyyy"
                    />
            </Box>

            <h2>Lopetus</h2>
            <Box padding={'4px'}>
                <DatePicker
                    selected={dates.endDate}
                    onChange={(date) => dispatch(setEndDate(date))}
                    dateFormat="d.M.yyyy"
                />
            </Box>

            <NextLink href='/productlist'>
                <Button>Siirry valitsemaan tavarat</Button>
            </NextLink>

        </div>
    )
}
