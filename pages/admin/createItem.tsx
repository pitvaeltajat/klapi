import React from "react";
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
} from "@chakra-ui/react";
import { Formik, Form, Field, FormikHelpers, FieldProps } from "formik";
import { CreatableSelect } from "chakra-react-select";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import NotAuthenticated from "../../components/NotAuthenticated";
import type { NextPage } from "next";
import type { Category, Location } from "@prisma/client";

interface FormValues {
  name: string;
  amount: number;
  description: string;
  locationId: { value: string; label: string } | undefined;
  categories: Array<{ value: string; label: string }>;
  submit?: string; // Add submit field for error handling
}

interface LocationWithLabel extends Location {
  label: string;
  value: string;
}

interface CategoryWithLabel extends Category {
  label: string;
  value: string;
}

const CreateItem: NextPage = () => {
  const { data: session } = useSession();
  const toast = useToast();

  const { data: locations, error: locationsError } = useSWR<
    LocationWithLabel[]
  >("/api/location/getLocations");

  const { data: categories, error: categoriesError } = useSWR<
    CategoryWithLabel[]
  >("/api/category/getCategories");

  if (session?.user?.group !== "ADMIN") {
    return <NotAuthenticated />;
  }

  if (locationsError || categoriesError) return <div>failed to load</div>;

  if (!categories || !locations) return <div>loading...</div>;

  locations.forEach((location) => {
    location.label = location.name;
    location.value = location.id;
  });

  categories.forEach((category) => {
    category.label = category.name;
    category.value = category.id;
  });

  const handleSubmit = async (
    values: FormValues,
    { setSubmitting, setErrors, resetForm }: FormikHelpers<FormValues>
  ) => {
    try {
      await fetch("/api/item/createItem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      toast({
        title: "Item created",
        description: "Item created successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      setSubmitting(false);
      resetForm();
    } catch (error) {
      if (error instanceof Error) {
        setErrors({ submit: error.message });
        toast({
          title: "Error",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }
      setSubmitting(false);
      resetForm();
    }
  };

  return (
    <>
      <Heading>Luo uusi kama</Heading>

      <Formik<FormValues>
        initialValues={{
          name: "",
          amount: 1,
          description: "",
          locationId: undefined,
          categories: [],
        }}
        onSubmit={async (values, actions) => {
          await handleSubmit(values, actions);
        }}
      >
        {(props) => (
          <Form onSubmit={props.handleSubmit}>
            <Field name="name">
              {({ field, form }: FieldProps<string, FormValues>) => (
                <FormControl
                  isInvalid={Boolean(form.errors.name && form.touched.name)}
                  isRequired
                >
                  <FormLabel htmlFor="name">Nimi</FormLabel>
                  <Input
                    {...field}
                    id="name"
                    placeholder="PJ-teltta"
                    value={form.values.name}
                  />
                  <FormErrorMessage>{form.errors.name}</FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Field name="amount">
              {({ field, form }: FieldProps<number, FormValues>) => (
                <FormControl
                  isInvalid={Boolean(form.errors.amount && form.touched.amount)}
                  isRequired
                >
                  <FormLabel htmlFor="amount">Määrä</FormLabel>
                  <NumberInput
                    id="amount"
                    {...field}
                    min={1}
                    value={form.values.amount}
                    onChange={(val) =>
                      form.setFieldValue(field.name, Number(val))
                    }
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <FormErrorMessage>{form.errors.amount}</FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Field name="description">
              {({ field, form }: FieldProps<string, FormValues>) => (
                <FormControl
                  isInvalid={Boolean(
                    form.errors.description && form.touched.description
                  )}
                >
                  <FormLabel htmlFor="description">Kuvaus</FormLabel>
                  <Textarea
                    id="description"
                    {...field}
                    value={form.values.description}
                    onChange={(e) =>
                      form.setFieldValue(field.name, e.target.value)
                    }
                    placeholder="Kamaa käytetään..."
                  />
                  <FormErrorMessage>
                    {String(form.errors.description)}
                  </FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Field name="categories">
              {({
                field,
                form,
              }: FieldProps<
                Array<{ value: string; label: string }>,
                FormValues
              >) => (
                <FormControl
                  isInvalid={Boolean(
                    form.errors.categories && form.touched.categories
                  )}
                >
                  <FormLabel htmlFor="categories">Kategoriat</FormLabel>
                  <CreatableSelect
                    id="categories"
                    isMulti
                    options={categories}
                    name={field.name}
                    placeholder="Retkikeittimet"
                    value={form.values.categories}
                    onChange={(option) =>
                      form.setFieldValue(field.name, option)
                    }
                    isClearable
                    backspaceRemovesValue
                    onBlur={field.onBlur}
                  />
                  <FormErrorMessage>
                    {String(form.errors.categories)}
                  </FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Field name="locationId">
              {({
                field,
                form,
              }: FieldProps<
                { value: string; label: string } | undefined,
                FormValues
              >) => (
                <FormControl
                  isInvalid={Boolean(
                    form.errors.locationId && form.touched.locationId
                  )}
                  isRequired
                >
                  <FormLabel htmlFor="locationId">Sijainti</FormLabel>
                  <CreatableSelect
                    options={locations}
                    id="locationId"
                    name={field.name}
                    placeholder="Kolon vessa"
                    value={form.values.locationId}
                    onChange={(option) =>
                      form.setFieldValue(field.name, option)
                    }
                    onBlur={field.onBlur}
                    isClearable
                  />
                  <FormErrorMessage>
                    {String(form.errors.locationId)}
                  </FormErrorMessage>
                </FormControl>
              )}
            </Field>
            <Button
              mt={4}
              colorScheme="teal"
              isLoading={props.isSubmitting}
              type="submit"
            >
              Luo kama
            </Button>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default CreateItem;
