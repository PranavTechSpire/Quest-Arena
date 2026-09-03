import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/api_service.dart';
import 'battle_arena_screen.dart';

class ArenaLobbyScreen extends StatefulWidget {
  const ArenaLobbyScreen({Key? key}) : super(key: key);

  @override
  State<ArenaLobbyScreen> createState() => _ArenaLobbyScreenState();
}

class _ArenaLobbyScreenState extends State<ArenaLobbyScreen> {
  final ApiService _apiService = ApiService();
  final SupabaseClient _supabase = Supabase.instance.client;
  
  bool _isLoading = false;
  Map<String, dynamic>? _matchData;
  final TextEditingController _roomCodeController = TextEditingController();
  
  RealtimeChannel? _channel;

  @override
  void dispose() {
    _channel?.unsubscribe();
    _roomCodeController.dispose();
    super.dispose();
  }

  void _listenToMatch(String matchId) {
    _channel = _supabase
        .channel('public:custom_matches:id=eq.$matchId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'custom_matches',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: matchId,
          ),
          callback: (payload) {
            final newMatch = payload.newRecord;
            setState(() {
              _matchData = newMatch;
            });
            
            if (newMatch['status'] == 'active') {
              _channel?.unsubscribe();
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => BattleArenaScreen(matchData: newMatch)),
              );
            }
          },
        )
        .subscribe();
  }

  Future<void> _createMatch() async {
    setState(() => _isLoading = true);
    try {
      final match = await _apiService.createMatch();
      setState(() {
        _matchData = match;
        _isLoading = false;
      });
      _listenToMatch(match['id']);
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _joinMatch() async {
    final code = _roomCodeController.text.trim().toUpperCase();
    if (code.length != 4) return;
    
    setState(() => _isLoading = true);
    try {
      final match = await _apiService.joinMatch(code);
      setState(() {
        _matchData = match;
        _isLoading = false;
      });
      _listenToMatch(match['id']);
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _startMatch() async {
    if (_matchData == null) return;
    setState(() => _isLoading = true);
    try {
      await _apiService.startMatch(_matchData!['id']);
      // The realtime listener will navigate automatically
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('1v1 Arena Lobby')),
      body: Center(
        child: _isLoading 
          ? const CircularProgressIndicator()
          : _matchData == null
            ? _buildInitialView()
            : _buildLobbyView(),
      ),
    );
  }

  Widget _buildInitialView() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.sports_esports, size: 64, color: Colors.orangeAccent),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _createMatch,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(double.infinity, 50),
              backgroundColor: Colors.orangeAccent,
            ),
            child: const Text('Create Match (Host)', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 32),
          const Text('OR JOIN EXISTING'),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _roomCodeController,
                  decoration: const InputDecoration(
                    labelText: 'Room Code (4 chars)',
                    border: OutlineInputBorder(),
                  ),
                  maxLength: 4,
                  textCapitalization: TextCapitalization.characters,
                ),
              ),
              const SizedBox(width: 16),
              ElevatedButton(
                onPressed: _joinMatch,
                style: ElevatedButton.styleFrom(minimumSize: const Size(100, 56)),
                child: const Text('Join'),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildLobbyView() {
    final isHost = _matchData!['host_id'] == _supabase.auth.currentUser!.id;
    final hasGuest = _matchData!['guest_id'] != null;

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Text('ROOM CODE', style: TextStyle(letterSpacing: 2)),
        Text(
          _matchData!['room_code'],
          style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.orangeAccent),
        ),
        const SizedBox(height: 48),
        Text(
          hasGuest ? 'Player Joined! Ready to start.' : 'Waiting for opponent...',
          style: const TextStyle(fontSize: 18),
        ),
        const SizedBox(height: 32),
        if (isHost)
          ElevatedButton(
            onPressed: hasGuest ? _startMatch : null,
            style: ElevatedButton.styleFrom(
              minimumSize: const Size(200, 50),
              backgroundColor: Colors.green,
            ),
            child: const Text('Start Match'),
          ),
        if (!isHost)
          const Text('Waiting for host to start...', style: TextStyle(color: Colors.grey)),
      ],
    );
  }
}
