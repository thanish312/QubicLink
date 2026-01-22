import { Box, Button, Select, MenuItem, TextField, IconButton, Paper } from '@mui/material';
import { AddCircleOutline, DeleteOutline } from '@mui/icons-material';

const Condition = ({ condition, onChange, onRemove, qubicAssets }) => {
    const handleLogicChange = (e) => {
        const newCondition = { ...condition };
        if (e.target.value === 'all') {
            delete newCondition.any;
            newCondition.all = [ { asset: 'QUBIC', operator: 'gt', value: '0' } ];
        } else {
            delete newCondition.all;
            newCondition.any = [ { asset: 'QUBIC', operator: 'gt', value: '0' } ];
        }
        onChange(newCondition);
    };

    const handleConditionChange = (index, newSubCondition) => {
        const newCondition = { ...condition };
        if (newCondition.all) {
            newCondition.all[index] = newSubCondition;
        } else {
            newCondition.any[index] = newSubCondition;
        }
        onChange(newCondition);
    };

    const addSubCondition = () => {
        const newCondition = { ...condition };
        const subCondition = { asset: 'QUBIC', operator: 'gt', value: '0' };
        if (newCondition.all) {
            newCondition.all.push(subCondition);
        } else {
            newCondition.any.push(subCondition);
        }
        onChange(newCondition);
    };

    const removeSubCondition = (index) => {
        const newCondition = { ...condition };
        if (newCondition.all) {
            newCondition.all.splice(index, 1);
        } else {
            newCondition.any.splice(index, 1);
        }
        onChange(newCondition);
    };

    const addSubConditionGroup = () => {
        const newCondition = { ...condition };
        const subCondition = { all: [{ asset: 'QUBIC', operator: 'gt', value: '0' }] };
        if (newCondition.all) {
            newCondition.all.push(subCondition);
        } else {
            newCondition.any.push(subCondition);
        }
        onChange(newCondition);
    };

    if (condition.all || condition.any) {
        const conditions = condition.all || condition.any;
        const logic = condition.all ? 'all' : 'any';

        return (
            <Paper elevation={2} sx={{ p: 2, mt: 1, width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Select value={logic} onChange={handleLogicChange} size="small">
                        <MenuItem value="all">All (AND)</MenuItem>
                        <MenuItem value="any">Any (OR)</MenuItem>
                    </Select>
                    {onRemove && (
                        <IconButton onClick={onRemove} size="small" sx={{ ml: 'auto' }}>
                            <DeleteOutline />
                        </IconButton>
                    )}
                </Box>
                {conditions.map((sub, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Condition
                            condition={sub}
                            onChange={(newSub) => handleConditionChange(index, newSub)}
                            onRemove={() => removeSubCondition(index)}
                            qubicAssets={qubicAssets}
                        />
                    </Box>
                ))}
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button startIcon={<AddCircleOutline />} onClick={addSubCondition} size="small" variant="outlined">
                        Add Condition
                    </Button>
                    <Button startIcon={<AddCircleOutline />} onClick={addSubConditionGroup} size="small" variant="outlined">
                        Add Group
                    </Button>
                </Box>
            </Paper>
        );
    } else {
        return (
            <Paper elevation={2} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Select
                    value={condition.asset}
                    onChange={(e) => onChange({ ...condition, asset: e.target.value })}
                    size="small"
                    sx={{ minWidth: 120 }}
                >
                    <MenuItem value="QUBIC">QUBIC</MenuItem>
                    {qubicAssets.map((asset) => (
                        <MenuItem key={asset} value={asset}>
                            {asset}
                        </MenuItem>
                    ))}
                </Select>
                <Select
                    value={condition.operator}
                    onChange={(e) => onChange({ ...condition, operator: e.target.value })}
                    size="small"
                >
                    <MenuItem value="gt">&gt;</MenuItem>
                    <MenuItem value="lt">&lt;</MenuItem>
                    <MenuItem value="eq">=</MenuItem>
                </Select>
                <TextField
                    value={condition.value}
                    onChange={(e) => onChange({ ...condition, value: e.target.value })}
                    size="small"
                    variant="outlined"
                />
                {onRemove && (
                    <IconButton onClick={onRemove} size="small">
                        <DeleteOutline />
                    </IconButton>
                )}
            </Paper>
        );
    }
};

export default Condition;