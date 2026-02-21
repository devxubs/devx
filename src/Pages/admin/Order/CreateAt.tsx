import { Stack, Typography } from "@mui/material";

const CreateAt = ({ date, time }: { date: string; time: string }) => {
   return (
      <Stack spacing={1} direction="row" alignItems="center" height={"100%"}>
         <Stack>
            <Typography variant="body2" color="textPrimary">
               {date}
            </Typography>
            <Typography variant="body2" fontSize={14} color="textSecondary">
               {time}
            </Typography>
         </Stack>
      </Stack>
   );
};

export default CreateAt;
