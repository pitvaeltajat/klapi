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
import { Formik, Form, Field } from 'formik';
import { CreatableSelect } from 'chakra-react-select';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getServerSideProps(context) {
    const locations = await prisma.location.findMany();
    const categories = await prisma.category.findMany();
    locations.map((location) => {
        location.label = location.name;
        location.value = location.id;
    });
    categories.map((category) => {
        category.label = category.name;
        category.value = category.id;
    });
    return {
        props: {
            locations,
            categories,
        },
    };
}

export default function NewItem({ locations, categories }) {
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
                                        options={categories}
                                        name={field.name}
                                        placeholder='Retkikeittimet'
                                        value={
                                            categories
                                                ? categories.find(
                                                      (category) =>
                                                          category.value ===
                                                          field.value
                                                  )
                                                : ''
                                        }
                                        onChange={(option) =>
                                            form.setFieldValue(
                                                field.name,
                                                option.value
                                            )
                                        }
                                        onBlur={field.onBlur}
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
                                        options={locations}
                                        id='locations'
                                        name={field.name}
                                        placeholder='Kolon vessa'
                                        value={
                                            locations
                                                ? locations.find(
                                                      (location) =>
                                                          location.value ===
                                                          field.value
                                                  )
                                                : ''
                                        }
                                        onChange={(option) =>
                                            form.setFieldValue(
                                                field.name,
                                                option.value
                                            )
                                        }
                                        onBlur={field.onBlur}
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
