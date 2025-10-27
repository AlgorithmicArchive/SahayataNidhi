import React, { useEffect, useState, useContext, useMemo } from "react";
import {
  Box,
  Container,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Modal,
} from "@mui/material";
import { useForm, Controller, useWatch } from "react-hook-form";
import axiosInstance from "../../axiosConfig";
import MessageModal from "../../components/MessageModal";
import ServerSideTable from "../../components/ServerSideTable";
import { UserContext } from "../../UserContext";

export default function AddOfficeDetails() {
  const { userType, officerAuthorities } = useContext(UserContext);
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      officeName: "",
      officeType: "",
      divisionCode: 0,
      districtCode: 0,
      areaCode: 0,
      areaName: "",
    },
  });

  const divisionCode = useWatch({ control, name: "divisionCode" });
  const districtCode = useWatch({ control, name: "districtCode" });
  const officeType = useWatch({ control, name: "officeType" });

  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [modalMessage, setModalMessage] = useState({
    title: "",
    message: "",
    type: "success",
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOfficeDetail, setEditingOfficeDetail] = useState(null);
  const [refreshTable, setRefreshTable] = useState(false);
  const [accessLevel, setAccessLevel] = useState("");
  const [selectedOffice, setSelectedOffice] = useState(null);

  // Fetched data
  const [offices, setOffices] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [tehsils, setTehsils] = useState([]);
  const [blocks, setBlocks] = useState([]);

  // Check if user has permission to update/delete
  const canModifyOfficeDetails = useMemo(() => {
    return (
      officerAuthorities?.canDirectWithhold ||
      userType === "SeniorOfficer" ||
      userType === "Admin"
    );
  }, [userType, officerAuthorities]);

  // Fetch all required data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [officesRes, divisionsRes, districtsRes, tehsilsRes, blocksRes] =
          await Promise.all([
            axiosInstance.get("/Admin/GetOfficesType"),
            axiosInstance.get("/Admin/GetDivisions"),
            axiosInstance.get("/Admin/GetDistricts"),
            axiosInstance.get("/Admin/GetTehsils"),
            axiosInstance.get("/Admin/GetBlocks"),
          ]);

        // Fix: officesType → array of { OfficeId, OfficeType, AccessLevel }
        setOffices(officesRes.data.officesType || []);

        // Fix: divisions → { label, value } → map to { divisionId, divisionName }
        const divs = divisionsRes.data.divisions || [];
        setDivisions(
          divs.map((d) => ({
            divisionId: Number(d.value),
            divisionName: d.label,
          })),
        );

        // Fix: districts → { districtId, districtName, Division }
        setDistricts(districtsRes.data || []);

        // Fix: tehsils → { tehsilId, tehsilName, DistrictId }
        setTehsils(tehsilsRes.data || []);

        // Fix: blocks → { blockId, blockName, DistrictId }
        setBlocks(blocksRes.data || []);
      } catch (error) {
        setErrorMessage(`Error loading data: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle officeType change (new entry) — preserved logic
  useEffect(() => {
    if (officeType && !editingOfficeDetail) {
      const office = offices.find((o) => o.OfficeId === officeType);
      if (office) {
        setSelectedOffice(office);
        setAccessLevel(office.AccessLevel);
        resetLocationsBasedOnAccessLevel(office.AccessLevel);
      }
    }
  }, [officeType, editingOfficeDetail, offices]);

  // Reset locations based on access level — preserved
  const resetLocationsBasedOnAccessLevel = (level) => {
    switch (level) {
      case "State":
        setValue("divisionCode", 0);
        setValue("districtCode", 0);
        setValue("areaCode", 0);
        setValue("areaName", "");
        break;
      case "Division":
        setValue("districtCode", 0);
        setValue("areaCode", 0);
        setValue("areaName", "");
        break;
      case "District":
        setValue("areaCode", 0);
        setValue("areaName", "");
        break;
      case "Tehsil":
      case "Block":
        break;
      default:
        break;
    }
  };

  // Cascading resets — preserved
  useEffect(() => {
    if (divisionCode && divisionCode !== 0) {
      setValue("districtCode", 0);
      setValue("areaCode", 0);
      setValue("areaName", "");
    }
  }, [divisionCode, setValue]);

  useEffect(() => {
    if (districtCode && districtCode !== 0) {
      setValue("areaCode", 0);
      setValue("areaName", "");
    }
  }, [districtCode, setValue]);

  // Reset form when edit modal closes — preserved
  useEffect(() => {
    if (!editModalOpen) {
      reset({
        officeName: "",
        officeType: "",
        divisionCode: 0,
        districtCode: 0,
        areaCode: 0,
        areaName: "",
      });
      setEditingOfficeDetail(null);
      setAccessLevel("");
      setSelectedOffice(null);
    }
  }, [editModalOpen, reset]);

  // Filtered lists — fixed keys
  const filteredDistricts = useMemo(() => {
    return districts.filter((d) => d.Division === divisionCode);
  }, [divisionCode, districts]);

  const filteredAreas = useMemo(() => {
    if (accessLevel === "Tehsil") {
      return tehsils.filter((t) => t.DistrictId === districtCode);
    } else if (accessLevel === "Block") {
      return blocks.filter((b) => b.DistrictId === districtCode);
    }
    return [];
  }, [accessLevel, districtCode, tehsils, blocks]);

  // Form submission
  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("StateCode", "0");
      formData.append("Divisioncode", data.divisionCode.toString());
      formData.append("DistrictCode", data.districtCode.toString());
      formData.append("AreaCode", data.areaCode.toString());
      formData.append("AreaName", data.areaName);
      formData.append("OfficeName", data.officeName);
      formData.append("OfficeType", data.officeType.toString());

      const response = await axiosInstance.post(
        "/Admin/AddOfficeDetail",
        formData,
      );

      if (response.data.status) {
        setModalMessage({
          title: "Add Office Detail",
          message: "Office Detail Added Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        reset();
        setErrorMessage("");
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Failed to add: ${response.data.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
    }
  };

  // Handle update
  const handleUpdate = async (data) => {
    if (!editingOfficeDetail) return;

    try {
      const formData = new FormData();
      formData.append(
        "OfficeDetailId",
        editingOfficeDetail.officeDetailId.toString(),
      );
      formData.append("StateCode", "0");
      formData.append("Divisioncode", data.divisionCode.toString());
      formData.append("DistrictCode", data.districtCode.toString());
      formData.append("AreaCode", data.areaCode.toString());
      formData.append("AreaName", data.areaName);
      formData.append("OfficeName", data.officeName);
      formData.append("OfficeType", data.officeType.toString());

      const response = await axiosInstance.post(
        "/Admin/UpdateOfficeDetail",
        formData,
      );

      if (response.data.status) {
        setModalMessage({
          title: "Update Office Detail",
          message: "Updated Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        setEditModalOpen(false);
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Update failed: ${response.data.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
    }
  };

  // Handle delete
  const handleDelete = async (officeDetailId) => {
    if (!window.confirm("Are you sure you want to delete this office detail?"))
      return;

    try {
      const formData = new FormData();
      formData.append("OfficeDetailId", officeDetailId.toString());

      const response = await axiosInstance.post(
        "/Admin/DeleteOfficeDetail",
        formData,
      );

      if (response.data.status) {
        setModalMessage({
          title: "Delete Office Detail",
          message: "Deleted Successfully.",
          type: "success",
        });
        setShowMessageModal(true);
        setRefreshTable((prev) => !prev);
      } else {
        setErrorMessage(
          `Delete failed: ${response.data.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      setErrorMessage(`Error: ${error.message}`);
    }
  };

  // Action functions
  const actionFunctions = {
    UpdateOfficeDetail: (row) => {
      if (!canModifyOfficeDetails) {
        setErrorMessage("No permission to update.");
        return;
      }
      const userdata = row.original;
      setEditingOfficeDetail(userdata);
      setValue("officeName", userdata.officeName);
      setValue("officeType", userdata.officeType);
      setValue("divisionCode", userdata.divisionCode);
      setValue("districtCode", userdata.districtCode);
      setValue("areaCode", userdata.areaCode);
      setValue("areaName", userdata.areaName);
      setAccessLevel(userdata.accessLevel);
      setSelectedOffice({
        officeId: userdata.officeType,
        accessLevel: userdata.accessLevel,
      });
      setEditModalOpen(true);
    },
    DeleteOfficeDetail: (row) => {
      if (!canModifyOfficeDetails) {
        setErrorMessage("No permission to delete.");
        return;
      }
      handleDelete(row.original.officeDetailId);
    },
  };

  // Table columns
  const columns = [
    { field: "officeDetailId", headerName: "ID", flex: 1 },
    { field: "officeName", headerName: "Office Name", flex: 1 },
    { field: "officeType", headerName: "Office Type", flex: 1 },
    { field: "divisionCode", headerName: "Division Code", flex: 0.5 },
    { field: "districtCode", headerName: "District Code", flex: 0.5 },
    { field: "areaCode", headerName: "Area Code", flex: 0.5 },
    { field: "areaName", headerName: "Area Name", flex: 1 },
  ];

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Preserved conditional rendering logic
  const shouldShowDivision = accessLevel !== "State";
  const shouldShowDistrict = ["District", "Tehsil", "Block"].includes(
    accessLevel,
  );
  const shouldShowArea = ["Tehsil", "Block"].includes(accessLevel);

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" fontWeight="bold" align="center" gutterBottom>
        Add New Office Detail
      </Typography>
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {errorMessage}
        </Alert>
      )}

      <Box
        sx={{ bgcolor: "white", p: 4, borderRadius: 2, boxShadow: 3, mb: 6 }}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="officeName"
                control={control}
                rules={{ required: "Office name is required" }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Office Name"
                    variant="outlined"
                    error={!!errors.officeName}
                    helperText={errors.officeName?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="officeType"
                control={control}
                rules={{ required: "Office type is required" }}
                render={({ field }) => (
                  <FormControl
                    fullWidth
                    variant="outlined"
                    error={!!errors.officeType}
                  >
                    <InputLabel shrink>Office Type</InputLabel>
                    <Select {...field} label="Office Type">
                      <MenuItem value="">Select Office Type</MenuItem>
                      {offices.map((office) => (
                        <MenuItem key={office.officeId} value={office.officeId}>
                          {office.officeType}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.officeType && (
                      <Typography color="error" variant="caption">
                        {errors.officeType.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Preserved logic */}
            {shouldShowDivision && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="divisionCode"
                  control={control}
                  rules={{ required: "Division is required" }}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      variant="outlined"
                      error={!!errors.divisionCode}
                    >
                      <InputLabel shrink>Division</InputLabel>
                      <Select
                        {...field}
                        label="Division"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        <MenuItem value={0}>Select Division</MenuItem>
                        {divisions.map((div) => (
                          <MenuItem key={div.divisionId} value={div.divisionId}>
                            {div.divisionName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            )}

            {shouldShowDistrict && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="districtCode"
                  control={control}
                  rules={{ required: "District is required" }}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      variant="outlined"
                      error={!!errors.districtCode}
                    >
                      <InputLabel shrink>District</InputLabel>
                      <Select
                        {...field}
                        label="District"
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        <MenuItem value={0}>Select District</MenuItem>
                        {filteredDistricts.map((dist) => (
                          <MenuItem
                            key={dist.districtId}
                            value={dist.districtId}
                          >
                            {dist.districtName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            )}

            {shouldShowArea && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="areaCode"
                  control={control}
                  rules={{ required: "Area is required" }}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      variant="outlined"
                      error={!!errors.areaCode}
                    >
                      <InputLabel shrink>{accessLevel}</InputLabel>
                      <Select
                        {...field}
                        label={accessLevel}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          field.onChange(val);
                          const selected =
                            accessLevel === "Tehsil"
                              ? tehsils.find((t) => t.tehsilId === val)
                              : blocks.find((b) => b.blockId === val);
                          setValue(
                            "areaName",
                            selected
                              ? accessLevel === "Tehsil"
                                ? selected.tehsilName
                                : selected.blockName
                              : "",
                          );
                        }}
                      >
                        <MenuItem value={0}>Select {accessLevel}</MenuItem>
                        {filteredAreas.map((area) => {
                          const id =
                            accessLevel === "Tehsil"
                              ? area.tehsilId
                              : area.blockId;
                          const name =
                            accessLevel === "Tehsil"
                              ? area.tehsilName
                              : area.blockName;
                          return (
                            <MenuItem key={id} value={id}>
                              {name}
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 3, py: 1.5 }}
                disabled={!canModifyOfficeDetails}
              >
                Add Office Detail
              </Button>
            </Grid>
          </Grid>
        </form>
      </Box>

      <ServerSideTable
        url="/Admin/GetOfficeDetails"
        Title="Existing Office Details"
        extraParams={{}}
        canSanction={false}
        canHavePool={false}
        pendingApplications={false}
        actionFunctions={actionFunctions}
        columns={columns}
        refresh={refreshTable}
        onAction={(actionFunction, row) => actionFunctions[actionFunction](row)}
      />

      <MessageModal
        open={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        title={modalMessage.title}
        message={modalMessage.message}
        type={modalMessage.type}
      />

      {/* Edit Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <Box
          sx={{
            bgcolor: "white",
            p: 4,
            borderRadius: 2,
            maxWidth: 600,
            mx: "auto",
            mt: "5%",
            boxShadow: 24,
            maxHeight: "80vh",
            overflowY: "auto",
          }}
        >
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Edit Office Detail
          </Typography>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {errorMessage}
            </Alert>
          )}

          <form onSubmit={handleSubmit(handleUpdate)}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="officeName"
                  control={control}
                  rules={{ required: "Required" }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Office Name"
                      variant="outlined"
                      error={!!errors.officeName}
                      helperText={errors.officeName?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="officeType"
                  control={control}
                  rules={{ required: "Required" }}
                  render={({ field }) => (
                    <FormControl
                      fullWidth
                      variant="outlined"
                      error={!!errors.officeType}
                    >
                      <InputLabel shrink>Office Type</InputLabel>
                      <Select
                        {...field}
                        label="Office Type"
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          const office = offices.find(
                            (o) => o.OfficeId === e.target.value,
                          );
                          if (office) {
                            setAccessLevel(office.AccessLevel);
                            setSelectedOffice(office);
                          }
                        }}
                      >
                        <MenuItem value="">Select</MenuItem>
                        {offices.map((office) => (
                          <MenuItem
                            key={office.officeId}
                            value={office.officeId}
                          >
                            {office.officeType}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              {shouldShowDivision && (
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="divisionCode"
                    control={control}
                    rules={{ required: "Required" }}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        variant="outlined"
                        error={!!errors.divisionCode}
                      >
                        <InputLabel shrink>Division</InputLabel>
                        <Select
                          {...field}
                          label="Division"
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        >
                          <MenuItem value={0}>Select</MenuItem>
                          {divisions.map((div) => (
                            <MenuItem
                              key={div.divisionId}
                              value={div.divisionId}
                            >
                              {div.divisionName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              )}

              {shouldShowDistrict && (
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="districtCode"
                    control={control}
                    rules={{ required: "Required" }}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        variant="outlined"
                        error={!!errors.districtCode}
                      >
                        <InputLabel shrink>District</InputLabel>
                        <Select
                          {...field}
                          label="District"
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                        >
                          <MenuItem value={0}>Select</MenuItem>
                          {filteredDistricts.map((dist) => (
                            <MenuItem
                              key={dist.districtId}
                              value={dist.districtId}
                            >
                              {dist.districtName}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              )}

              {shouldShowArea && (
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="areaCode"
                    control={control}
                    rules={{ required: "Required" }}
                    render={({ field }) => (
                      <FormControl
                        fullWidth
                        variant="outlined"
                        error={!!errors.areaCode}
                      >
                        <InputLabel shrink>{accessLevel}</InputLabel>
                        <Select
                          {...field}
                          label={accessLevel}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            field.onChange(val);
                            const selected =
                              accessLevel === "Tehsil"
                                ? tehsils.find((t) => t.tehsilId === val)
                                : blocks.find((b) => b.blockId === val);
                            setValue(
                              "areaName",
                              selected
                                ? accessLevel === "Tehsil"
                                  ? selected.tehsilName
                                  : selected.blockName
                                : "",
                            );
                          }}
                        >
                          <MenuItem value={0}>Select {accessLevel}</MenuItem>
                          {filteredAreas.map((area) => {
                            const id =
                              accessLevel === "Tehsil"
                                ? area.tehsilId
                                : area.blockId;
                            const name =
                              accessLevel === "Tehsil"
                                ? area.tehsilName
                                : area.blockName;
                            return (
                              <MenuItem key={id} value={id}>
                                {name}
                              </MenuItem>
                            );
                          })}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 2,
                    mt: 3,
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={() => setEditModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" color="primary">
                    Update
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Box>
      </Modal>
    </Container>
  );
}
