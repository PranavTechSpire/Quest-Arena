import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/api_service.dart';

class BattleArenaScreen extends StatefulWidget {
  final Map<String, dynamic> matchData;

  const BattleArenaScreen({Key? key, required this.matchData}) : super(key: key);

  @override
  State<BattleArenaScreen> createState() => _BattleArenaScreenState();
}

class _BattleArenaScreenState extends State<BattleArenaScreen> {
  final ApiService _apiService = ApiService();
  final SupabaseClient _supabase = Supabase.instance.client;
  
  late String _matchId;
  late bool _isHost;
  
  List<dynamic> _rounds = [];
  Map<String, dynamic>? _currentQuestion;
  int _currentRoundNumber = 1;
  
  num _myScore = 0;
  num _opponentScore = 0;
  
  String? _myAnswer;
  String? _opponentAnswer;
  bool _isOpponentDone = false;
  
  bool _isLoading = true;
  RealtimeChannel? _channel;
  DateTime _startTime = DateTime.now();

  @override
  void initState() {
    super.initState();
    _matchId = widget.matchData['id'];
    _isHost = widget.matchData['host_id'] == _supabase.auth.currentUser!.id;
    _fetchRoundsAndListen();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }

  Future<void> _fetchRoundsAndListen() async {
    // 1. Fetch initial match_rounds
    final data = await _supabase
        .from('match_rounds')
        .select('*, questions(id, question_text, options)')
        .eq('match_id', _matchId)
        .order('round_number', ascending: true);
        
    setState(() {
      _rounds = data;
      _isLoading = false;
      _loadCurrentRound();
    });

    // 2. Listen to updates on match_rounds
    _channel = _supabase
        .channel('public:match_rounds:match_id=eq.$_matchId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'match_rounds',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'match_id',
            value: _matchId,
          ),
          callback: (payload) {
            final updatedRound = payload.newRecord;
            if (updatedRound['round_number'] == _currentRoundNumber) {
              setState(() {
                if (_isHost && updatedRound['guest_answer'] != null) {
                  _isOpponentDone = true;
                } else if (!_isHost && updatedRound['host_answer'] != null) {
                  _isOpponentDone = true;
                }
              });
              
              _checkRoundCompletion(updatedRound);
            }
          },
        )
        .subscribe();
  }

  void _loadCurrentRound() {
    if (_currentRoundNumber <= _rounds.length) {
      final round = _rounds[_currentRoundNumber - 1];
      _currentQuestion = round['questions'];
      _myAnswer = null;
      _opponentAnswer = null;
      _isOpponentDone = false;
      _startTime = DateTime.now();
    } else {
      // Match Over
      _showMatchResult();
    }
  }

  void _checkRoundCompletion(Map<String, dynamic> updatedRound) {
    if (updatedRound['host_answer'] != null && updatedRound['guest_answer'] != null) {
      // Both have answered, update scores and move to next round
      setState(() {
        _myScore += _isHost ? (updatedRound['host_score'] ?? 0) : (updatedRound['guest_score'] ?? 0);
        _opponentScore += _isHost ? (updatedRound['guest_score'] ?? 0) : (updatedRound['host_score'] ?? 0);
      });
      
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() {
            _currentRoundNumber++;
            _loadCurrentRound();
          });
        }
      });
    }
  }

  Future<void> _submitAnswer(String option) async {
    if (_myAnswer != null) return;
    
    setState(() => _myAnswer = option);
    
    final timeTakenMs = DateTime.now().difference(_startTime).inMilliseconds;
    
    try {
      await _apiService.submitArenaAnswer(_matchId, _currentRoundNumber, option, timeTakenMs);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  void _showMatchResult() {
    final bool isWinner = _myScore > _opponentScore;
    final bool isDraw = _myScore == _opponentScore;
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        title: Text(isDraw ? 'It\'s a Draw!' : isWinner ? 'You Won! 🎉' : 'You Lost 😔'),
        content: Text('Final Score:\nYou: ${_myScore.toStringAsFixed(2)}\nOpponent: ${_opponentScore.toStringAsFixed(2)}'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop(); // Exit to dashboard
            },
            child: const Text('Return to Dashboard'),
          )
        ],
      )
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_currentQuestion == null) {
      return const Scaffold(body: Center(child: Text('Match Over')));
    }

    final options = Map<String, String>.from(_currentQuestion!['options']);

    return Scaffold(
      appBar: AppBar(
        title: const Text('1v1 Battle Arena'),
        automaticallyImplyLeading: false,
      ),
      body: Column(
        children: [
          // Scoreboard Header
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.black87,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  children: [
                    const Text('YOU', style: TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.bold)),
                    Text(_myScore.toStringAsFixed(2), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                    if (_myAnswer != null) const Icon(Icons.check_circle, color: Colors.blueAccent, size: 16)
                  ],
                ),
                Text('Round $_currentRoundNumber/${_rounds.length}', style: const TextStyle(fontSize: 18, color: Colors.orangeAccent)),
                Column(
                  children: [
                    const Text('OPPONENT', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                    Text(_opponentScore.toStringAsFixed(2), style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                    if (_isOpponentDone) const Icon(Icons.check_circle, color: Colors.redAccent, size: 16)
                  ],
                ),
              ],
            ),
          ),
          
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2C2C2C),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _currentQuestion!['question_text'],
                      style: const TextStyle(fontSize: 18, height: 1.5),
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  ...['a', 'b', 'c', 'd'].map((key) {
                    final isSelected = _myAnswer == key;
                    Color bgColor = const Color(0xFF1E1E1E);
                    Color borderColor = Colors.transparent;

                    if (isSelected) {
                      bgColor = Colors.blueAccent.withOpacity(0.2);
                      borderColor = Colors.blueAccent;
                    }

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12.0),
                      child: InkWell(
                        onTap: _myAnswer != null ? null : () => _submitAnswer(key),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: bgColor,
                            border: Border.all(color: borderColor, width: 2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 14,
                                backgroundColor: borderColor == Colors.transparent ? Colors.grey[800] : borderColor,
                                child: Text(key.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 12)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(child: Text(options[key] ?? '')),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                  
                  if (_myAnswer != null && !_isOpponentDone)
                    const Padding(
                      padding: EdgeInsets.only(top: 24.0),
                      child: Center(child: Text('Waiting for opponent...', style: TextStyle(fontStyle: FontStyle.italic))),
                    )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
