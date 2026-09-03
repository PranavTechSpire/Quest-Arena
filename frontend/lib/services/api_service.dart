import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/env.dart';

class ApiService {
  final SupabaseClient _supabase = Supabase.instance.client;

  Future<Map<String, String>> _getHeaders() async {
    final session = _supabase.auth.currentSession;
    if (session == null) throw Exception("User not authenticated");
    
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ${session.accessToken}',
    };
  }

  Future<Map<String, dynamic>> getProfile() async {
    final response = await http.get(
      Uri.parse('${Env.apiUrl}/profile'),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load profile');
    }
  }

  Future<List<dynamic>> getDailyQuests() async {
    final response = await http.get(
      Uri.parse('${Env.apiUrl}/quests/daily'),
      headers: await _getHeaders(),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load daily quests');
    }
  }

  Future<Map<String, dynamic>> submitQuest(String questionId, String selectedOption, int timeTakenMs) async {
    final response = await http.post(
      Uri.parse('${Env.apiUrl}/quests/submit'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'question_id': questionId,
        'selected_option': selectedOption,
        'time_taken_ms': timeTakenMs,
      }),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else if (response.statusCode == 409) {
      throw Exception('Question already attempted today');
    } else {
      throw Exception('Failed to submit quest');
    }
  }
  Future<Map<String, dynamic>> createMatch() async {
    final response = await http.post(
      Uri.parse('${Env.apiUrl}/arena/create'),
      headers: await _getHeaders(),
      body: jsonEncode({}),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to create match');
  }

  Future<Map<String, dynamic>> joinMatch(String roomCode) async {
    final response = await http.post(
      Uri.parse('${Env.apiUrl}/arena/join'),
      headers: await _getHeaders(),
      body: jsonEncode({'room_code': roomCode}),
    );
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception('Failed to join match');
  }

  Future<void> startMatch(String matchId) async {
    final response = await http.post(
      Uri.parse('${Env.apiUrl}/arena/start'),
      headers: await _getHeaders(),
      body: jsonEncode({'match_id': matchId}),
    );
    if (response.statusCode != 200) throw Exception('Failed to start match');
  }

  Future<void> submitArenaAnswer(String matchId, int roundNumber, String selectedOption, int timeTakenMs) async {
    final response = await http.post(
      Uri.parse('${Env.apiUrl}/arena/submit'),
      headers: await _getHeaders(),
      body: jsonEncode({
        'match_id': matchId,
        'round_number': roundNumber,
        'selected_option': selectedOption,
        'time_taken_ms': timeTakenMs
      }),
    );
    if (response.statusCode != 200) throw Exception('Failed to submit answer');
  }
}
