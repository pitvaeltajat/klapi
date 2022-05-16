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
    useToast,
} from '@chakra-ui/react';
import { Formik, Form, Field } from 'formik';
import { CreatableSelect } from 'chakra-react-select';
import useSWR from 'swr';

export default function CreateItem() {
    const toast = useToast();

    const { data: locations, error: locationsError } =
        useSWR('/api/getLocations');
    const { data: categories, error: categoriesError } =
        useSWR('/api/getCategories');

    if (locationsError || categoriesError) return <div>failed to load</div>;

    // to prevent "loading", there should be a initial state initialized during SSR
    if (!categories || !locations) return <div>loading...</div>;
    // map locations and categories to be suitable for chakra-react-select
    locations.map((location) => {
        location.label = location.name;
        location.value = location.id;
    });
    categories.map((category) => {
        category.label = category.name;
        category.value = category.id;
    });

    const handleSubmit = async (
        values,
        { setSubmitting, setErrors, resetForm }
    ) => {
        try {
            // call createItem api route
            await fetch('/api/createItem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(values),
            }).then(
                toast({
                    title: 'Item created',
                    description: 'Item created successfully',
                    status: 'success',
                    duration: 5000,
                    isClosable: true,
                })
            );
            setSubmitting(false);
            resetForm();
            // does not reset form. Should have input fields hardcoded?
        } catch (error) {
            setErrors({ submit: error.message });
            toast({
                title: 'Error',
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
            setSubmitting(false);
            resetForm();
        }
    };

    return (
        <>
            <Heading>Luo uusi kama</Heading>

            <Formik
                initialValues={{
                    name: '',
                    amount: 1,
                    description: '',
                    locationId: undefined,
                    categories: [],
                }}
                onSubmit={async (values, actions) => {
                    await handleSubmit(values, actions);
                }}
            >
                {(props) => (
                    <Form onSubmit={props.handleSubmit}>
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
                                        value={form.values.name}
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
                                        value={form.values.amount}
                                        onChange={(val) =>
                                            form.setFieldValue(
                                                field.name,
                                                Number(val)
                                            )
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
                                        value={form.values.description}
                                        onChange={(e) =>
                                            form.setFieldValue(
                                                field.name,
                                                e.target.value
                                            )
                                        }
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
                                        options={categories}
                                        name={field.name}
                                        placeholder='Retkikeittimet'
                                        value={form.values.categories}
                                        onChange={(option) =>
                                            form.setFieldValue(
                                                field.name,
                                                option
                                            )
                                        }
                                        isClearable
                                        backspaceRemovesValue
                                        onBlur={field.onBlur}
                                    />
                                    <FormErrorMessage>
                                        {form.errors.categories}
                                    </FormErrorMessage>
                                </FormControl>
                            )}
                        </Field>
                        <Field name='locationId'>
                            {({ field, form }) => (
                                <FormControl
                                    isInvalid={
                                        form.errors.locationId &&
                                        form.touched.locationId
                                    }
                                    isRequired
                                >
                                    <FormLabel htmlFor='locationId'>
                                        Sijainti
                                    </FormLabel>
                                    {/* TODO: field does not reset on form submission */}
                                    <CreatableSelect
                                        options={locations}
                                        id='locationId'
                                        name={field.name}
                                        placeholder='Kolon vessa'
                                        value={form.values.locationId}
                                        onChange={(option) =>
                                            form.setFieldValue(
                                                field.name,
                                                option
                                            )
                                        }
                                        onBlur={field.onBlur}
                                        isClearable
                                    />
                                    <FormErrorMessage>
                                        {form.errors.locationId}
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
