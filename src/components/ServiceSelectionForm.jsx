import React, { useEffect, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import CustomButton from "./CustomButton";

const ServiceSelectionForm = ({ services, errors, onServiceSelect }) => {
  const { control, handleSubmit, setValue } = useForm();
  const [selectedValue, setSelectedValue] = useState("");

  const onSubmit = (data) => {
    onServiceSelect(data.Service);
  };

  useEffect(() => {
    if (services.length > 0) {
      // Default to first service
      const defaultService = services[0].value;
      setSelectedValue(defaultService);
      setValue("Service", defaultService);

      // Auto-submit if only one service
      if (services.length === 1) {
        handleSubmit(onSubmit)();
      }
    }
  }, [services]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        margin: "0 auto",
        color: "primary.main",
        width: "100%",
      }}
    >
      <FormControl fullWidth margin="normal" error={!!errors?.Service}>
        <InputLabel id="service-select-label">Select Service</InputLabel>
        <Controller
          name="Service"
          control={control}
          rules={{ required: "This field is required" }}
          render={({ field }) => (
            <Select
              {...field}
              labelId="service-select-label"
              value={selectedValue}
              label="Select Service"
              onChange={(e) => {
                field.onChange(e);
                setSelectedValue(e.target.value);
              }}
            >
              {services.map((service) => (
                <MenuItem key={service.value} value={service.value}>
                  {service.label}
                </MenuItem>
              ))}
            </Select>
          )}
        />
        {errors?.Service && (
          <FormHelperText>{errors.Service.message}</FormHelperText>
        )}
      </FormControl>

      {services.length > 1 && (
        <CustomButton
          type="submit"
          text="Get Details"
          bgColor="primary.main"
          color="background.paper"
          width="50%"
          sx={{ mt: 2 }}
        />
      )}
    </Box>
  );
};

export default ServiceSelectionForm;
