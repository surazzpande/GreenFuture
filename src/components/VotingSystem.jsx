import React, { useState, useEffect } from 'react';
import { 
  Button, Container, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Tabs, Tab, Box, 
  Chip, ThemeProvider, createTheme, Card, CardContent, Grid, 
  Snackbar, Alert 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import HowToVoteIcon from '@mui/icons-material/HowToVote';
import PublicIcon from '@mui/icons-material/Public';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
import { collection, getDocs, updateDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import '../styles/VotingSystem.css';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  '&.MuiTableCell-head': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    fontWeight: 'bold',
  },
  '&.MuiTableCell-body': {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
}));

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const VotingSystem = () => {
  const [ideas, setIdeas] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "ideas"));
      const ideasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        hasVoted: false
      }));
      setIdeas(ideasData);
    } catch (error) {
      console.error("Error fetching ideas: ", error);
      setError("Failed to fetch ideas. Please try again.");
    }
  };

  const handleVote = async (id) => {
    if (!auth.currentUser) {
      setError('You must be logged in to vote.');
      return;
    }

    const ideaRef = doc(db, "ideas", id);
    const ideaDoc = await getDoc(ideaRef);
    const ideaData = ideaDoc.data();

    if (ideaData.votedUsers && ideaData.votedUsers.includes(auth.currentUser.uid)) {
      setError('You have already voted for this idea.');
      return;
    }

    try {
      await updateDoc(ideaRef, {
        votes: ideaData.votes + 1,
        votedUsers: arrayUnion(auth.currentUser.uid)
      });
      setIdeas(ideas.map(idea => 
        idea.id === id ? { ...idea, votes: idea.votes + 1, hasVoted: true } : idea
      ));
      setSuccess('Vote submitted successfully!');
    } catch (error) {
      console.error("Error updating vote: ", error);
      setError('Failed to submit vote. Please try again.');
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const filteredIdeas = ideas.filter(idea => 
    tabValue === 0 || 
    (tabValue === 1 && idea.type === 'individual') || 
    (tabValue === 2 && idea.type === 'team')
  );

  const topIdeas = [...filteredIdeas].sort((a, b) => b.votes - a.votes).slice(0, 3);
  const remainingIdeas = [...filteredIdeas].sort((a, b) => b.votes - a.votes).slice(3);

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" className="voting-system-container">
        <Typography variant="h3" gutterBottom align="center" color="primary" className="page-title">
          <HowToVoteIcon sx={{ fontSize: 40, verticalAlign: 'middle', mr: 1 }} />
          Idea Voting System
        </Typography>

        <Card elevation={3} className="voting-card">
          <CardContent>
            <Tabs value={tabValue} onChange={handleTabChange} centered className="idea-tabs">
              <Tab icon={<PublicIcon />} label="All Ideas" />
              <Tab icon={<PersonIcon />} label="Individual Ideas" />
              <Tab icon={<GroupIcon />} label="Team Ideas" />
            </Tabs>

            <Grid container spacing={3} className="top-ideas">
              {topIdeas.map((idea) => (
                <Grid item xs={12} sm={4} key={idea.id}>
                  <Card className="idea-card">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>{idea.title}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {idea.description}
                      </Typography>
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip 
                          icon={idea.type === 'individual' ? <PersonIcon /> : <GroupIcon />}
                          label={idea.type}
                          color={idea.type === 'individual' ? 'primary' : 'secondary'}
                          size="small"
                        />
                        <Chip 
                          icon={<PublicIcon />}
                          label={idea.region}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2">Votes: {idea.votes}</Typography>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleVote(idea.id)}
                          disabled={!auth.currentUser || idea.hasVoted}
                          startIcon={<HowToVoteIcon />}
                          size="small"
                        >
                          Vote
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <TableContainer component={Paper} elevation={3} className="ideas-table">
              <Table>
                <TableHead>
                  <TableRow>
                    <StyledTableCell>Title</StyledTableCell>
                    <StyledTableCell>Description</StyledTableCell>
                    <StyledTableCell>Type</StyledTableCell>
                    <StyledTableCell>Region</StyledTableCell>
                    <StyledTableCell align="center">Votes</StyledTableCell>
                    <StyledTableCell align="center">Action</StyledTableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {remainingIdeas.map((idea) => (
                    <StyledTableRow key={idea.id}>
                      <StyledTableCell component="th" scope="row">{idea.title}</StyledTableCell>
                      <StyledTableCell>{idea.description}</StyledTableCell>
                      <StyledTableCell>
                        <Chip 
                          icon={idea.type === 'individual' ? <PersonIcon /> : <GroupIcon />}
                          label={idea.type}
                          color={idea.type === 'individual' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </StyledTableCell>
                      <StyledTableCell>{idea.region}</StyledTableCell>
                      <StyledTableCell align="center">{idea.votes}</StyledTableCell>
                      <StyledTableCell align="center">
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleVote(idea.id)}
                          disabled={!auth.currentUser || idea.hasVoted}
                          startIcon={<HowToVoteIcon />}
                          size="small"
                        >
                          Vote
                        </Button>
                      </StyledTableCell>
                    </StyledTableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <Snackbar open={!!error} autoHideDuration={6000} onClose={() => setError('')}>
          <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
        <Snackbar open={!!success} autoHideDuration={6000} onClose={() => setSuccess('')}>
          <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
}

export default VotingSystem;
