import React, { useEffect, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Button,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";

const ServiceSelectionForm = ({ services, errors, onServiceSelect }) => {
  const { control, handleSubmit, setValue } = useForm();
  const [selectedValue, setSelectedValue] = useState("");

  const onSubmit = (data) => {
    if (data.Service) {
      onServiceSelect(data.Service);
    }
  };

  useEffect(() => {
    if (services.length === 1) {
      // Only one service: select automatically
      const defaultService = services[0].value;
      setSelectedValue(defaultService);
      setValue("Service", defaultService);
      handleSubmit(onSubmit)();
    } else if (selectedValue === "") {
      // More than one service: default to "Please Select"
      setSelectedValue("");
      setValue("Service", "");
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
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
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
              {services.length > 1 && (
                <MenuItem value="">
                  <em>Please Select</em>
                </MenuItem>
              )}
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
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{
            mt: 2,
            width: "20%",
            background: "linear-gradient(to bottom right, #2561E8, #1F43B4)",
            color: "background.paper",
            margin: "0 auto",
            fontSize: 24,
          }}
        >
          Get Details
        </Button>
      )}
    </Box>
  );
};

export default ServiceSelectionForm;
