import { Helmet } from 'react-helmet-async';
import { useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// @mui
import { Container, Typography, List, Stack, Box, Link, Card, CardContent} from '@mui/material';
import GlobalContext from '../components/context/GlobalContext';

// ----------------------------------------------------------------------

export default function DashboardAppPage() {
  // const theme = useTheme();
  const store = useContext(GlobalContext);
  const navigate = useNavigate();

  console.log('[DASHBOARD APP PAGE] Store is: ', store);

  useEffect(() => {
    store.loadAppList();
  }, []);

  return (
    <>
      <Helmet>
        <title> S2A Dashboard </title>
      </Helmet>

      <Container maxWidth="xl">
        <Typography variant="h4" >
          Your Apps
        </Typography>
        <List sx={{ width: '100%' }}>
            {
                store.appList.map((app) => (
                  <Box component="span" sx={{ p: 2 }} key={app._id}>
                    <Card>
                      <Link sx={{ display: 'contents' }} onClick={() => {
                        console.log("TESTING");
                        store.setCurrentApp(app._id);
                        navigate("/editor");
                      }}>
                        <CardContent>
                          <Stack direction="row" alignItems="center" spacing={2} >
                            {/* <Box component="img" alt={title} src={image} sx={{ width: 48, height: 48, borderRadius: 1.5, flexShrink: 0 }} /> */}
                      
                            <Box sx={{ minWidth: 240, flexGrow: 1 }}>
                              <Typography color="inherit" variant="subtitle2" underline="hover" noWrap>
                                {app.name}
                              </Typography>
                      
                              <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
                                {app.creator}
                              </Typography>
                            </Box>
                      
                            <Typography variant="caption" sx={{ pr: 3, flexShrink: 0, color: 'text.secondary' }}>
                              {app.published ? "Published" : "Unpublished"}
                            </Typography>
                            
                          </Stack>
                        </CardContent>
                      </Link>
                    </Card>
                  </Box>
                ))
            }
            </List>
      </Container>
    </>
  );
}
