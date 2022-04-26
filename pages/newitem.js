import React from 'react';
import {
    FormControl,
    FormErrorMessage,
    FormLabel,
    Input,
    Button,
    Heading,
    NumberInputField,
    NumberInput,
    NumberIncrementStepper,
    NumberDecrementStepper,
    NumberInputStepper,
    Textarea,
} from '@chakra-ui/react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { CreatableSelect } from 'chakra-react-select';

export default function NewItem() {
    return (
        <>
            <Heading>Luo uusi kama</Heading>
            <Formik
                initialValues={{ amount: 1 }}
                onSubmit={(values, actions) => {
                    setTimeout(() => {
                        alert(JSON.stringify(values, null, 2));
                        actions.setSubmitting(false);
                    }, 1000);
                }}
            >
                {(props) => (
                    <Form>
                        <Field name='name'>
                            {({ field, form }) => (
                                <FormControl
                                    isInvalid={
                                        form.errors.name && form.touched.name
                                    }
                                    isRequired
                                >
                                    <FormLabel htmlFor='name'>Nimi</FormLabel>
                                    <Input
                                        {...field}
                                        id='name'
                                        placeholder='PJ-teltta'
                                    />
                                    <FormErrorMessage>
                                        {form.errors.name}
                                    </FormErrorMessage>
                                </FormControl>
                            )}
                        </Field>
                        <Field name='amount'>
                            {({ field, form }) => (
                                <FormControl
                                    isInvalid={
                                        form.errors.amount &&
                                        form.touched.amount
                                    }
                                    isRequired
                                >
                                    <FormLabel htmlFor='amount'>
                                        Määrä
                                    </FormLabel>
                                    <NumberInput
                                        id='amount'
                                        {...field}
                                        min={1}
                                        onChange={(val) =>
                                            form.setFieldValue(field.name, val)
                                        }
                                    >
                                        <NumberInputField />
                                        <NumberInputStepper>
                                            <NumberIncrementStepper />
                                            <NumberDecrementStepper />
                                        </NumberInputStepper>
                                    </NumberInput>
                                    <FormErrorMessage>
                                        {form.errors.amount}
                                    </FormErrorMessage>
                                </FormControl>
                            )}
                        </Field>
                        <Field name='description'>
                            {({ field, form }) => (
                                <FormControl
                                    isInvalid={
                                        form.errors.description &&
                                        form.touched.description
                                    }
                                >
                                    <FormLabel htmlFor='description'>
                                        Kuvaus
                                    </FormLabel>
                                    <Textarea
                                        id='description'
                                        {...field}
                                        placeholder='Kamaa käytetään...'
                                    />
                                    <FormErrorMessage>
                                        {form.errors.description}
                                    </FormErrorMessage>
                                </FormControl>
                            )}
                        </Field>
                        <Field name='categories'>
                            {({ field, form }) => (
                                <FormControl
                                    isInvalid={
                                        form.errors.categories &&
                                        form.touched.categories
                                    }
                                >
                                    <FormLabel htmlFor='categories'>
                                        Kategoriat
                                    </FormLabel>
                                    <CreatableSelect
                                        id='categories'
                                        isMulti
                                        options={props.categories}
                                        {...field}
                                        placeholder='Kamaa käytetään... (kategoria1, kategoria2, kategoria3)'
                                    />
                                    <FormErrorMessage>
                                        {form.errors.categories}
                                    </FormErrorMessage>
                                </FormControl>
                            )}
                        </Field>
                        <Field name='locations'>
                            {({ field, form }) => (
                                <FormControl
                                    isInvalid={
                                        form.errors.locations &&
                                        form.touched.locations
                                    }
                                >
                                    <FormLabel htmlFor='locations'>
                                        Sijainnit
                                    </FormLabel>
                                    <CreatableSelect
                                        isMulti
                                        options={props.locations}
                                        id='locations'
                                        {...field}
                                        placeholder='Sijainti (paikka1, paikka2, paikka3)'
                                    />
                                    <FormErrorMessage>
                                        {form.errors.locations}
                                    </FormErrorMessage>
                                </FormControl>
                            )}
                        </Field>
                        <Button
                            mt={4}
                            colorScheme='teal'
                            isLoading={props.isSubmitting}
                            type='submit'
                        >
                            Luo kama
                        </Button>
                    </Form>
                )}
            </Formik>
        </>
    );
}
